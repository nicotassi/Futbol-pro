import type { Exercise, WorkoutDraft, WorkoutItemDraft } from './api';

/**
 * Minutos sugeridos para el entrenamiento:
 * - con duración y series: duración por serie × series;
 * - con duración sola: esa duración;
 * - sin duración: la duración estimada del ejercicio en la biblioteca;
 * más los descansos entre series.
 */
export function estimateMinutes(
  items: WorkoutItemDraft[],
  exercises: Map<string, Exercise>,
): number {
  const seconds = items.reduce((total, it) => {
    const sets = Math.max(1, it.sets ?? 1);
    const work = it.duration_sec
      ? it.duration_sec * sets
      : (exercises.get(it.exercise_id)?.est_minutes ?? 0) * 60;
    const rest = (it.rest_sec ?? 0) * (sets - 1);
    return total + work + rest;
  }, 0);
  return Math.round(seconds / 60);
}

const inRange = (v: number | null, min: number, max: number) =>
  v === null || (Number.isInteger(v) && v >= min && v <= max);

/** Validación previa al guardado (coincide con los CHECK de la base). */
export function validateWorkout(draft: WorkoutDraft): string[] {
  const errors: string[] = [];
  if (draft.name.length < 2 || draft.name.length > 80)
    errors.push('El nombre debe tener entre 2 y 80 caracteres.');
  if (draft.items.length === 0) errors.push('Agregá al menos un ejercicio.');
  if (draft.est_minutes !== null && !inRange(draft.est_minutes, 1, 240))
    errors.push('La duración total debe estar entre 1 y 240 minutos.');
  if (!draft.is_template && !draft.scheduled_for) errors.push('Elegí la fecha del entrenamiento.');
  draft.items.forEach((it, i) => {
    const n = i + 1;
    if (!inRange(it.sets, 1, 50)) errors.push(`Ejercicio ${n}: las series van de 1 a 50.`);
    if (!inRange(it.reps, 1, 500)) errors.push(`Ejercicio ${n}: las repeticiones van de 1 a 500.`);
    if (!inRange(it.duration_sec, 1, 14400))
      errors.push(`Ejercicio ${n}: la duración no es válida.`);
    if (!inRange(it.rest_sec, 0, 3600))
      errors.push(`Ejercicio ${n}: el descanso va de 0 a 3600 segundos.`);
  });
  return errors;
}
