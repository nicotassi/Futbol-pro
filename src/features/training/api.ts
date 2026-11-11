import { db } from '@/services/supabase';
import type { Enums, Tables, TablesInsert } from '@/types/database';
import type { WatchData } from '@/features/sessionWatch/watchData';

export type Exercise = Tables<'exercises'>;
export type ExerciseInput = Omit<TablesInsert<'exercises'>, 'player_id' | 'is_custom'>;
export type ExerciseCategory = Enums<'exercise_category'>;
export type Workout = Tables<'workout_templates'>;
export type WorkoutItem = Tables<'workout_items'>;
export type Session = Tables<'workout_sessions'>;
export type SessionResult = Tables<'session_results'>;

export interface WorkoutWithItems extends Workout {
  items: WorkoutItem[];
}

export const trainingKeys = {
  exercises: (playerId: string) => ['exercises', playerId] as const,
  favorites: (userId: string) => ['exercise-favorites', userId] as const,
  workouts: (playerId: string) => ['workouts', playerId] as const,
  workout: (id: string) => ['workout', id] as const,
  sessions: (playerId: string) => ['sessions', playerId] as const,
  sessionResults: (sessionId: string) => ['session-results', sessionId] as const,
};

// ---------------------------------------------------------------- Ejercicios
export async function fetchExercises(playerId: string): Promise<Exercise[]> {
  const { data, error } = await db()
    .from('exercises')
    .select('*')
    .eq('player_id', playerId)
    .order('category')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createExercise(playerId: string, input: ExerciseInput): Promise<Exercise> {
  const { data, error } = await db()
    .from('exercises')
    .insert({ ...input, player_id: playerId, is_custom: true })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<Exercise> {
  const { data, error } = await db()
    .from('exercises')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await db().from('exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchFavorites(userId: string): Promise<string[]> {
  const { data, error } = await db()
    .from('exercise_favorites')
    .select('exercise_id')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((f) => f.exercise_id);
}

export async function setFavorite(
  userId: string,
  playerId: string,
  exerciseId: string,
  favorite: boolean,
) {
  const client = db();
  const { error } = favorite
    ? await client
        .from('exercise_favorites')
        .insert({ user_id: userId, player_id: playerId, exercise_id: exerciseId })
    : await client
        .from('exercise_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId);
  if (error) throw error;
}

// ----------------------------------------------------------- Entrenamientos
export async function fetchWorkouts(playerId: string): Promise<Workout[]> {
  const { data, error } = await db()
    .from('workout_templates')
    .select('*')
    .eq('player_id', playerId)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchWorkout(id: string): Promise<WorkoutWithItems> {
  const client = db();
  const [workout, items] = await Promise.all([
    client.from('workout_templates').select('*').eq('id', id).single(),
    client
      .from('workout_items')
      .select('*')
      .eq('template_id', id)
      .eq('removed', false)
      .order('position'),
  ]);
  if (workout.error) throw workout.error;
  if (items.error) throw items.error;
  return { ...workout.data, items: items.data };
}

export interface WorkoutDraft {
  id?: string;
  name: string;
  objective: string;
  notes: string;
  est_minutes: number | null;
  is_template: boolean;
  scheduled_for: string | null;
  items: WorkoutItemDraft[];
}

export interface WorkoutItemDraft {
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  instructions: string;
}

/** Guarda en una sola operación atómica (función save_workout en la base). */
export async function saveWorkout(playerId: string, draft: WorkoutDraft): Promise<string> {
  const { data, error } = await db().rpc('save_workout', {
    p_workout: {
      id: draft.id ?? '',
      player_id: playerId,
      name: draft.name,
      objective: draft.objective,
      notes: draft.notes,
      est_minutes: draft.est_minutes ?? '',
      is_template: draft.is_template,
      scheduled_for: draft.scheduled_for ?? '',
    },
    p_items: draft.items.map((i) => ({
      exercise_id: i.exercise_id,
      sets: i.sets ?? '',
      reps: i.reps ?? '',
      duration_sec: i.duration_sec ?? '',
      rest_sec: i.rest_sec ?? '',
      instructions: i.instructions,
    })),
  });
  if (error) throw error;
  return data;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await db().from('workout_templates').delete().eq('id', id);
  if (error) throw error;
}

// ----------------------------------------------------------------- Sesiones
export async function fetchSessions(playerId: string, limit = 100): Promise<Session[]> {
  const { data, error } = await db()
    .from('workout_sessions')
    .select('*')
    .eq('player_id', playerId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchSessionResults(sessionId: string): Promise<SessionResult[]> {
  const { data, error } = await db()
    .from('session_results')
    .select('*')
    .eq('session_id', sessionId)
    .eq('removed', false);
  if (error) throw error;
  return data;
}

export interface SessionPayload {
  session: {
    player_id: string;
    template_id: string | null;
    title: string;
    started_at: string;
    ended_at: string | null;
    status: 'completed' | 'abandoned';
    actual_minutes: number | null;
    rpe: number | null;
    notes: string;
    post_state: number | null;
    client_id: string;
  } & Partial<WatchData>;
  results: {
    workout_item_id: string | null;
    exercise_id: string | null;
    completed: boolean;
    sets_done: number | null;
    reps_done: number | null;
  }[];
}

/** Registra una sesión (idempotente por client_id: los reintentos no duplican). */
export async function sendSession(payload: SessionPayload): Promise<string> {
  const s = payload.session;
  const { data, error } = await db().rpc('finish_session', {
    p_session: {
      ...s,
      template_id: s.template_id ?? '',
      ended_at: s.ended_at ?? '',
      actual_minutes: s.actual_minutes ?? '',
      rpe: s.rpe ?? '',
      post_state: s.post_state ?? '',
      hr_avg: s.hr_avg ?? '',
      hr_max: s.hr_max ?? '',
      calories: s.calories ?? '',
      training_load: s.training_load ?? '',
      aerobic_effect: s.aerobic_effect ?? '',
      anaerobic_effect: s.anaerobic_effect ?? '',
      zone_vo2max_pct: s.zone_vo2max_pct ?? '',
      zone_intensive_pct: s.zone_intensive_pct ?? '',
    },
    p_results: payload.results.map((r) => ({
      ...r,
      workout_item_id: r.workout_item_id ?? '',
      exercise_id: r.exercise_id ?? '',
      sets_done: r.sets_done ?? '',
      reps_done: r.reps_done ?? '',
    })),
  });
  if (error) throw error;
  return data;
}

/** Carga o corrige los datos del reloj de una sesión ya registrada. */
export async function updateSessionWatch(id: string, data: WatchData): Promise<void> {
  const { data: rows, error } = await db()
    .from('workout_sessions')
    .update(data)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (rows.length === 0) throw new Error('No tenés permiso para cambiar esta sesión.');
}
