import { format } from 'date-fns';
import type { Enums } from '@/types/database';

export type CalendarCategory = Enums<'calendar_category'>;

export interface CalendarItem {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  category: CalendarCategory;
  detail?: string;
  done: boolean;
  /** Evento creado a mano (se puede cancelar). */
  manualId?: string;
}

export const categoryLabels: Record<CalendarCategory, string> = {
  club_training: 'Entrenamiento del club',
  extra_training: 'Entrenamiento extra',
  match: 'Partido',
  assessment: 'Evaluación',
  rest: 'Descanso',
  goal: 'Objetivo',
  special: 'Evento especial',
};

export const categoryDot: Record<CalendarCategory, string> = {
  club_training: 'bg-ink',
  extra_training: 'bg-gold-strong',
  match: 'bg-success',
  assessment: 'bg-warning-bright',
  rest: 'bg-line',
  goal: 'bg-gold',
  special: 'bg-danger',
};

interface Sources {
  sessions: {
    id: string;
    title: string;
    started_at: string;
    status: string;
    actual_minutes: number | null;
  }[];
  workouts: {
    id: string;
    name: string;
    scheduled_for: string | null;
    is_template: boolean;
    est_minutes: number | null;
  }[];
  matches: { id: string; opponent: string; played_on: string }[];
  assessments: { id: string; test_name: string; assessed_on: string }[];
  events: {
    id: string;
    title: string;
    category: CalendarCategory;
    event_date: string;
    est_minutes: number | null;
    description: string | null;
    status: string;
  }[];
}

/** Une todo lo que pasa (o está programado) en una lista ordenada por fecha. */
export function buildCalendarItems(s: Sources): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const x of s.sessions)
    if (x.status === 'completed')
      items.push({
        id: `s-${x.id}`,
        date: format(new Date(x.started_at), 'yyyy-MM-dd'),
        title: x.title,
        category: 'extra_training',
        detail: x.actual_minutes ? `${x.actual_minutes} min` : undefined,
        done: true,
      });
  for (const x of s.workouts)
    if (!x.is_template && x.scheduled_for)
      items.push({
        id: `w-${x.id}`,
        date: x.scheduled_for,
        title: x.name,
        category: 'extra_training',
        detail: x.est_minutes ? `${x.est_minutes} min · programado` : 'Programado',
        done: false,
      });
  for (const x of s.matches)
    items.push({
      id: `m-${x.id}`,
      date: x.played_on,
      title: `Partido vs ${x.opponent}`,
      category: 'match',
      done: true,
    });
  for (const x of s.assessments)
    items.push({
      id: `a-${x.id}`,
      date: x.assessed_on,
      title: x.test_name,
      category: 'assessment',
      done: true,
    });
  for (const x of s.events)
    if (x.status !== 'cancelled')
      items.push({
        id: `e-${x.id}`,
        manualId: x.id,
        date: x.event_date,
        title: x.title,
        category: x.category,
        detail: x.description ?? (x.est_minutes ? `${x.est_minutes} min` : undefined),
        done: x.status === 'done',
      });
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export const itemsOn = (items: CalendarItem[], day: string) => items.filter((i) => i.date === day);

/** Resumen de una semana: entrenamientos, partidos y descansos. */
export function weekSummary(items: CalendarItem[], days: string[]) {
  const inWeek = items.filter((i) => days.includes(i.date));
  const count = (f: (i: CalendarItem) => boolean) => inWeek.filter(f).length;
  return {
    trainings: count((i) => i.category === 'club_training' || i.category === 'extra_training'),
    matches: count((i) => i.category === 'match'),
    rests: count((i) => i.category === 'rest'),
  };
}
