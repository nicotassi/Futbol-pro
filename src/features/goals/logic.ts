import type { Assessment, Dimension, GoalStatus } from './api';

/** Estado que corresponde a un porcentaje de progreso. */
export function statusForProgress(progress: number): GoalStatus {
  if (progress >= 100) return 'completed';
  if (progress > 0) return 'in_progress';
  return 'pending';
}

export const goalStatusLabels: Record<GoalStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  completed: 'Completado',
};

/**
 * Última evaluación de cada dimensión y variación respecto de la anterior
 * (según el puntaje 1–10). Sin dos evaluaciones, no hay variación.
 */
export function latestByDimension(rows: Assessment[]) {
  const sorted = [...rows].sort((a, b) => b.assessed_on.localeCompare(a.assessed_on));
  const out = new Map<Dimension, { latest: Assessment; delta: number | null }>();
  for (const a of sorted) {
    if (out.has(a.dimension)) continue;
    const prev = sorted.find(
      (b) => b.dimension === a.dimension && b !== a && b.score !== null && a.score !== null,
    );
    out.set(a.dimension, {
      latest: a,
      delta: prev && a.score !== null && prev.score !== null ? a.score - prev.score : null,
    });
  }
  return out;
}
