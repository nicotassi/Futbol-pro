import { del, get, set } from 'idb-keyval';
import type { WatchData } from '@/features/sessionWatch/watchData';
import type { Exercise, SessionPayload, WorkoutWithItems } from './api';
import { expandSteps } from './blocks';

/**
 * Sesión de entrenamiento en curso.
 * Se guarda en el celular en cada cambio: si se cierra la app, se retoma
 * donde quedó. Al finalizar se convierte en un registro para la base.
 */
export interface ActiveItem {
  workoutItemId: string | null;
  exerciseId: string | null;
  name: string;
  objective: string | null;
  steps: string[];
  sets: number | null;
  reps: number | null;
  durationSec: number | null;
  restSec: number | null;
  instructions: string | null;
  setsDone: number;
  completed: boolean;
  /** Módulo y vuelta (entrenamientos con módulos). Sin datos = un solo módulo, una vuelta. */
  blockName?: string;
  round?: number;
  rounds?: number;
  blockIndex?: number;
}

export interface ActiveSession {
  clientId: string;
  userId: string;
  playerId: string;
  workoutId: string | null;
  title: string;
  startedAt: string;
  index: number;
  /** Fin del descanso en curso (epoch ms) o null. */
  restEndsAt: number | null;
  items: ActiveItem[];
}

const KEY = 'fp-active-session';

export async function loadActiveSession(): Promise<ActiveSession | null> {
  try {
    return (await get<ActiveSession>(KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveActiveSession(session: ActiveSession) {
  try {
    await set(KEY, session);
  } catch {
    // Sin IndexedDB: la sesión sigue en memoria mientras la app esté abierta.
  }
}

export async function clearActiveSession() {
  try {
    await del(KEY);
  } catch {
    // ignorar
  }
}

export function createActiveSession(
  workout: WorkoutWithItems,
  exercises: Exercise[],
  ids: { clientId: string; userId: string; playerId: string; now?: Date },
): ActiveSession {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return {
    clientId: ids.clientId,
    userId: ids.userId,
    playerId: ids.playerId,
    workoutId: workout.id,
    title: workout.name,
    startedAt: (ids.now ?? new Date()).toISOString(),
    index: 0,
    restEndsAt: null,
    items: expandSteps(workout.items).map(({ item: it, blockName, round, rounds, blockIndex }) => {
      const ex = byId.get(it.exercise_id);
      return {
        blockName,
        round,
        rounds,
        blockIndex,
        workoutItemId: it.id,
        exerciseId: it.exercise_id,
        name: ex?.name ?? 'Ejercicio',
        objective: ex?.objective ?? null,
        steps: ex?.steps ?? [],
        sets: it.sets,
        reps: it.reps,
        durationSec: it.duration_sec,
        restSec: it.rest_sec,
        instructions: it.instructions,
        setsDone: 0,
        completed: false,
      };
    }),
  };
}

/** Cantidad de series objetivo (sin series indicadas = 1). */
export const targetSets = (item: ActiveItem) => Math.max(1, item.sets ?? 1);

/** Marca una serie como hecha; inicia el descanso si corresponde. */
export function completeSet(session: ActiveSession, now = Date.now()): ActiveSession {
  const item = session.items[session.index];
  if (!item || item.completed) return session;
  const setsDone = Math.min(item.setsDone + 1, targetSets(item));
  const completed = setsDone >= targetSets(item);
  const items = session.items.map((it, i) =>
    i === session.index ? { ...it, setsDone, completed } : it,
  );
  const rest = !completed && item.restSec ? now + item.restSec * 1000 : null;
  return { ...session, items, restEndsAt: rest };
}

export function toggleCompleted(session: ActiveSession, index: number): ActiveSession {
  return {
    ...session,
    items: session.items.map((it, i) =>
      i === index
        ? {
            ...it,
            completed: !it.completed,
            setsDone: !it.completed ? targetSets(it) : it.setsDone,
          }
        : it,
    ),
  };
}

export function goTo(session: ActiveSession, index: number): ActiveSession {
  const clamped = Math.max(0, Math.min(index, session.items.length - 1));
  return { ...session, index: clamped, restEndsAt: null };
}

export function skipRest(session: ActiveSession): ActiveSession {
  return { ...session, restEndsAt: null };
}

/** Minutos transcurridos desde el inicio (para proponer la duración real). */
export function elapsedMinutes(session: ActiveSession, now = new Date()): number {
  const ms = now.getTime() - new Date(session.startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export interface FinishForm {
  watch?: Partial<WatchData>;
  actualMinutes: number | null;
  rpe: number | null;
  postState: number | null;
  notes: string;
}

export function buildSessionPayload(
  session: ActiveSession,
  form: FinishForm,
  now = new Date(),
): SessionPayload {
  return {
    session: {
      player_id: session.playerId,
      template_id: session.workoutId,
      title: session.title,
      started_at: session.startedAt,
      ended_at: now.toISOString(),
      status: 'completed',
      actual_minutes: form.actualMinutes,
      rpe: form.rpe,
      notes: form.notes.trim(),
      post_state: form.postState,
      client_id: session.clientId,
      ...form.watch,
    },
    results: aggregateResults(session.items),
  };
}

/**
 * Un resultado por ejercicio del entrenamiento: si un módulo se repite, el ejercicio
 * cuenta como completado solo si se hizo en todas las vueltas, y las series se suman.
 */
export function aggregateResults(items: ActiveItem[]): SessionPayload['results'] {
  const out = new Map<string, SessionPayload['results'][number]>();
  const order: string[] = [];
  items.forEach((it, i) => {
    const key = it.workoutItemId ?? `libre-${i}`;
    const prev = out.get(key);
    if (!prev) {
      order.push(key);
      out.set(key, {
        workout_item_id: it.workoutItemId,
        exercise_id: it.exerciseId,
        completed: it.completed,
        sets_done: it.setsDone || null,
        reps_done: it.reps,
      });
    } else {
      prev.completed = prev.completed && it.completed;
      prev.sets_done = (prev.sets_done ?? 0) + it.setsDone || null;
    }
  });
  return order.map((k) => out.get(k)!);
}

/** Texto corto de dónde está: "Módulo 1 · vuelta 2 de 3" (vacío si no hay módulos ni vueltas). */
export function stepContext(item: ActiveItem, totalBlocks: number): string {
  const parts: string[] = [];
  if (totalBlocks > 1 && item.blockName) parts.push(item.blockName);
  if ((item.rounds ?? 1) > 1) parts.push(`vuelta ${item.round} de ${item.rounds}`);
  return parts.join(' · ');
}

export const countBlocks = (items: ActiveItem[]) =>
  new Set(items.map((i) => i.blockIndex ?? 0)).size;
