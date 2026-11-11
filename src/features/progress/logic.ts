import { addDays, format, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import type { MatchFull } from '@/features/matches/api';
import type { Assessment, Dimension, Goal } from '@/features/goals/api';
import type { Session } from '@/features/training/api';
import type { WellnessLog } from '@/features/wellness/api';

const wk = { weekStartsOn: 1 } as const;
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const localDay = (iso: string) => ymd(new Date(iso));

type SessionLike = Pick<Session, 'started_at' | 'actual_minutes' | 'status' | 'rpe'>;

// ------------------------------------------------------------------ Actividad
export interface WeekBucket {
  start: string; // lunes (yyyy-MM-dd)
  minutes: number;
  sessions: number;
}

/** Minutos y sesiones completadas por semana, de la más vieja a la actual. */
export function weeklyActivity(sessions: SessionLike[], now = new Date(), weeks = 8): WeekBucket[] {
  const thisWeek = startOfWeek(now, wk);
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => ({
    start: ymd(subWeeks(thisWeek, weeks - 1 - i)),
    minutes: 0,
    sessions: 0,
  }));
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const start = ymd(startOfWeek(new Date(s.started_at), wk));
    const b = buckets.find((x) => x.start === start);
    if (b) {
      b.minutes += s.actual_minutes ?? 0;
      b.sessions += 1;
    }
  }
  return buckets;
}

export function periodTotals(sessions: SessionLike[], from: Date, to: Date) {
  const f = ymd(from);
  const t = ymd(to);
  const rows = sessions.filter(
    (s) => s.status === 'completed' && localDay(s.started_at) >= f && localDay(s.started_at) < t,
  );
  const rpes = rows.map((s) => s.rpe).filter((v): v is number => v !== null);
  return {
    sessions: rows.length,
    minutes: rows.reduce((n, s) => n + (s.actual_minutes ?? 0), 0),
    avgRpe: rpes.length
      ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10
      : null,
  };
}

export interface Comparison {
  label: string;
  current: number;
  previous: number;
  /** null si el período anterior no tiene datos (no se muestran porcentajes sin base). */
  changePct: number | null;
}

/** Semana y mes actuales contra los anteriores (solo con base de comparación). */
export function comparisons(sessions: SessionLike[], now = new Date()): Comparison[] {
  const w0 = startOfWeek(now, wk);
  const m0 = startOfMonth(now);
  const mk = (label: string, cur: number, prev: number): Comparison => ({
    label,
    current: cur,
    previous: prev,
    changePct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null,
  });
  const cw = periodTotals(sessions, w0, addDays(w0, 7));
  const pw = periodTotals(sessions, subWeeks(w0, 1), w0);
  const cm = periodTotals(
    sessions,
    m0,
    addDays(new Date(m0.getFullYear(), m0.getMonth() + 1, 1), 0),
  );
  const pm = periodTotals(sessions, subMonths(m0, 1), m0);
  return [
    mk('Minutos: semana vs. anterior', cw.minutes, pw.minutes),
    mk('Sesiones: semana vs. anterior', cw.sessions, pw.sessions),
    mk('Minutos: mes vs. anterior', cm.minutes, pm.minutes),
    mk('Sesiones: mes vs. anterior', cm.sessions, pm.sessions),
  ];
}

// ------------------------------------------------------------------ Capacidades
export const dimensionOrder: Dimension[] = [
  'control',
  'passing',
  'speed',
  'endurance',
  'coordination',
  'vision',
];

/** Último puntaje (1–10) de cada capacidad; null si nunca se evaluó (no se inventa). */
export function radarValues(assessments: Assessment[]): Record<Dimension, number | null> {
  const out = Object.fromEntries(dimensionOrder.map((d) => [d, null])) as Record<
    Dimension,
    number | null
  >;
  const sorted = [...assessments]
    .filter((a) => a.score !== null)
    .sort((a, b) => b.assessed_on.localeCompare(a.assessed_on));
  for (const a of sorted) if (out[a.dimension] === null) out[a.dimension] = a.score;
  return out;
}

// ------------------------------------------------------------------ Puntos y logros
export interface ProgressInput {
  sessions: SessionLike[];
  matches: Pick<MatchFull, 'played_on'>[];
  wellness: Pick<WellnessLog, 'log_date'>[];
  goals: Pick<Goal, 'status' | 'approved'>[];
  assessments: Pick<Assessment, 'assessed_on'>[];
}

export const LEVELS = [
  { name: 'Debut', min: 0 },
  { name: 'Promesa', min: 50 },
  { name: 'Titular', min: 150 },
  { name: 'Capitán', min: 350 },
  { name: 'Crack', min: 700 },
  { name: 'Leyenda', min: 1200 },
];

/**
 * Puntos por constancia, no por cantidad: como máximo un entrenamiento y un
 * partido puntúan por día, y descansar/registrar bienestar también suma.
 */
export function computePoints(i: ProgressInput): number {
  const days = (dates: string[]) => new Set(dates).size;
  const trainDays = days(
    i.sessions.filter((s) => s.status === 'completed').map((s) => localDay(s.started_at)),
  );
  const matchDays = days(i.matches.map((m) => m.played_on));
  const wellnessDays = days(i.wellness.map((w) => w.log_date));
  const goalsDone = i.goals.filter((g) => g.status === 'completed' && g.approved).length;
  const assessDays = days(i.assessments.map((a) => a.assessed_on));
  return trainDays * 10 + matchDays * 15 + wellnessDays * 3 + goalsDone * 20 + assessDays * 5;
}

export function levelFor(points: number) {
  let idx = 0;
  LEVELS.forEach((l, k) => {
    if (points >= l.min) idx = k;
  });
  const cur = LEVELS[idx]!;
  const next = LEVELS[idx + 1] ?? null;
  return {
    index: idx + 1,
    name: cur.name,
    points,
    next: next?.name ?? null,
    toNext: next ? next.min - points : 0,
    pct: next ? Math.round(((points - cur.min) / (next.min - cur.min)) * 100) : 100,
  };
}

/** Días consecutivos (hasta hoy o ayer) con algún registro de actividad, bienestar o partido. */
export function currentStreak(dates: string[], now = new Date()): number {
  const set = new Set(dates);
  let day = now;
  if (!set.has(ymd(day))) day = addDays(day, -1);
  let n = 0;
  while (set.has(ymd(day))) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  earned: boolean;
}

export function achievements(i: ProgressInput, now = new Date()): Achievement[] {
  const trained = i.sessions.filter((s) => s.status === 'completed');
  const activityDays = [
    ...trained.map((s) => localDay(s.started_at)),
    ...i.matches.map((m) => m.played_on),
    ...i.wellness.map((w) => w.log_date),
  ];
  const streak = currentStreak(activityDays, now);
  const week = weeklyActivity(i.sessions, now, 1)[0]!;
  const goalsDone = i.goals.filter((g) => g.status === 'completed' && g.approved).length;
  const list: [string, string, string, boolean][] = [
    [
      'first-session',
      'Primer entrenamiento',
      'Registraste tu primera sesión.',
      trained.length >= 1,
    ],
    ['ten-sessions', 'Constancia', 'Diez entrenamientos registrados.', trained.length >= 10],
    [
      'first-match',
      'Debut en el registro',
      'Registraste tu primer partido.',
      i.matches.length >= 1,
    ],
    ['five-matches', 'Cinco partidos', 'Cinco partidos registrados.', i.matches.length >= 5],
    [
      'first-wellness',
      'Cuidar el cuerpo',
      'Registraste tu primer bienestar.',
      i.wellness.length >= 1,
    ],
    ['streak-3', 'Tres días seguidos', 'Tres días seguidos con algún registro.', streak >= 3],
    ['streak-7', 'Semana completa', 'Siete días seguidos con algún registro.', streak >= 7],
    ['first-goal', 'Objetivo cumplido', 'Completaste un objetivo aprobado.', goalsDone >= 1],
    ['assessed', 'A prueba', 'Tuviste tu primera evaluación física.', i.assessments.length >= 1],
    ['week-3', 'Semana activa', 'Tres entrenamientos en una misma semana.', week.sessions >= 3],
  ];
  return list.map(([code, name, description, earned]) => ({ code, name, description, earned }));
}

/** Fechas con actividad (para el calendario y las rachas). */
export const activityDates = (i: ProgressInput) => [
  ...i.sessions.filter((s) => s.status === 'completed').map((s) => localDay(s.started_at)),
  ...i.matches.map((m) => m.played_on),
  ...i.wellness.map((w) => w.log_date),
];
