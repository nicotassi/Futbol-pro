import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/** Semanas empiezan el lunes (uso habitual en Argentina). */
export const weekOptions = { weekStartsOn: 1 } as const;

/** Días visibles en la grilla mensual (incluye días de meses vecinos para completar semanas). */
export function monthGrid(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), weekOptions),
    end: endOfWeek(endOfMonth(date), weekOptions),
  });
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, weekOptions);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
