import { format, isToday, isTomorrow, isYesterday, startOfWeek } from 'date-fns';
import { locale } from '@/utils/date';
import { parseDateOnly } from '@/features/players/format';
import type { Session } from './api';

export function relativeDay(date: Date): string {
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  if (isTomorrow(date)) return 'Mañana';
  return format(date, "EEE d 'de' MMM", { locale });
}

export const scheduledLabel = (isoDate: string) => relativeDay(parseDateOnly(isoDate));

/** Minutos y cantidad de sesiones completadas desde el lunes de esta semana. */
export function weeklySummary(
  sessions: Pick<Session, 'started_at' | 'actual_minutes' | 'status'>[],
  now = new Date(),
) {
  const from = startOfWeek(now, { weekStartsOn: 1 }).getTime();
  const week = sessions.filter(
    (s) => s.status === 'completed' && new Date(s.started_at).getTime() >= from,
  );
  return {
    sessions: week.length,
    minutes: week.reduce((sum, s) => sum + (s.actual_minutes ?? 0), 0),
  };
}

export const rpeLabels: Record<number, string> = {
  1: 'Muy suave',
  2: 'Suave',
  3: 'Liviano',
  4: 'Moderado',
  5: 'Algo exigente',
  6: 'Exigente',
  7: 'Duro',
  8: 'Muy duro',
  9: 'Casi máximo',
  10: 'Máximo',
};

export const postStateLabels: Record<number, string> = {
  1: 'Muy cansado',
  2: 'Cansado',
  3: 'Normal',
  4: 'Bien',
  5: 'Excelente',
};
