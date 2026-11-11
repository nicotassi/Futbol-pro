import { db } from '@/services/supabase';
import type { Enums, Tables, TablesUpdate } from '@/types/database';

export type Goal = Tables<'goals'>;
export type GoalStatus = Enums<'goal_status'>;
export type Assessment = Tables<'assessments'>;
export type Dimension = Enums<'skill_dimension'>;

export const goalKeys = {
  goals: (playerId: string) => ['goals', playerId] as const,
  assessments: (playerId: string) => ['assessments', playerId] as const,
};

export async function fetchGoals(playerId: string): Promise<Goal[]> {
  const { data, error } = await db()
    .from('goals')
    .select('*')
    .eq('player_id', playerId)
    .eq('removed', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export interface GoalInput {
  name: string;
  description: string | null;
  target_date: string | null;
}

/** Papá crea objetivos ya aprobados; el jugador los propone (quedan sin aprobar). */
export async function createGoal(playerId: string, input: GoalInput, isAdmin: boolean) {
  const { error } = await db()
    .from('goals')
    .insert({ ...input, player_id: playerId, approved: isAdmin });
  if (error) throw error;
}

export type GoalPatch = TablesUpdate<'goals'>;

export async function updateGoal(id: string, patch: GoalPatch) {
  const { data, error } = await db().from('goals').update(patch).eq('id', id).select('id');
  if (error) throw error;
  // Sin permiso (RLS), la base responde 0 filas en lugar de error.
  if (data.length === 0) throw new Error('No tenés permiso para cambiar este objetivo.');
}

export async function fetchAssessments(playerId: string): Promise<Assessment[]> {
  const { data, error } = await db()
    .from('assessments')
    .select('*')
    .eq('player_id', playerId)
    .eq('removed', false)
    .order('assessed_on', { ascending: false });
  if (error) throw error;
  return data;
}

export interface AssessmentInput {
  assessed_on: string;
  dimension: Dimension;
  test_name: string;
  value: number | null;
  unit: string | null;
  score: number | null;
  notes: string | null;
}

export async function createAssessment(playerId: string, input: AssessmentInput) {
  const { error } = await db()
    .from('assessments')
    .insert({ ...input, player_id: playerId });
  if (error) throw error;
}

export async function removeAssessment(id: string) {
  const { data, error } = await db()
    .from('assessments')
    .update({ removed: true })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (data.length === 0) throw new Error('Solo papá puede quitar evaluaciones.');
}

export const dimensionLabels: Record<Dimension, string> = {
  control: 'Control',
  passing: 'Pase',
  speed: 'Velocidad',
  endurance: 'Resistencia',
  coordination: 'Coordinación',
  vision: 'Visión de juego',
};
