import { describe, expect, it } from 'vitest';
import {
  achievements,
  comparisons,
  computePoints,
  currentStreak,
  levelFor,
  radarValues,
  weeklyActivity,
  type ProgressInput,
} from './logic';

const now = new Date('2026-11-11T12:00:00'); // miércoles
const s = (day: string, minutes = 30, rpe: number | null = 5) => ({
  started_at: `${day}T10:00:00`,
  actual_minutes: minutes,
  status: 'completed' as const,
  rpe,
});
const empty: ProgressInput = {
  sessions: [],
  matches: [],
  wellness: [],
  goals: [],
  assessments: [],
};

describe('actividad semanal', () => {
  it('agrupa por semana (lunes) y deja en cero las vacías', () => {
    const r = weeklyActivity([s('2026-11-09'), s('2026-11-10', 20), s('2026-11-02', 45)], now, 3);
    expect(r.map((w) => w.start)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(r.map((w) => w.minutes)).toEqual([0, 45, 50]);
    expect(r[2]!.sessions).toBe(2);
  });
  it('ignora sesiones abandonadas', () => {
    const r = weeklyActivity([{ ...s('2026-11-09'), status: 'abandoned' as never }], now, 1);
    expect(r[0]!.sessions).toBe(0);
  });
});

describe('comparativas', () => {
  it('sin período anterior no hay porcentaje', () => {
    const c = comparisons([s('2026-11-09')], now);
    expect(c[0]!.current).toBe(30);
    expect(c[0]!.changePct).toBeNull();
  });
  it('calcula el cambio contra la semana anterior', () => {
    const c = comparisons([s('2026-11-09', 60), s('2026-11-02', 30)], now);
    expect(c[0]!.changePct).toBe(100);
  });
});

describe('radar', () => {
  it('usa la última evaluación; sin evaluar queda vacío', () => {
    const r = radarValues([
      { dimension: 'speed', score: 5, assessed_on: '2026-10-01' },
      { dimension: 'speed', score: 8, assessed_on: '2026-11-01' },
    ] as never);
    expect(r.speed).toBe(8);
    expect(r.control).toBeNull();
  });
});

describe('puntos y niveles', () => {
  it('empieza en cero', () => {
    expect(computePoints(empty)).toBe(0);
    expect(levelFor(0)).toMatchObject({ index: 1, name: 'Debut', toNext: 50 });
  });
  it('no premia entrenar de más: un solo punteo por día', () => {
    const one = computePoints({ ...empty, sessions: [s('2026-11-10')] });
    const many = computePoints({
      ...empty,
      sessions: [s('2026-11-10'), s('2026-11-10'), s('2026-11-10')],
    });
    expect(many).toBe(one);
  });
  it('registrar bienestar, partidos y objetivos aprobados suma', () => {
    const p = computePoints({
      ...empty,
      matches: [{ played_on: '2026-11-08' }],
      wellness: [{ log_date: '2026-11-10' }],
      goals: [
        { status: 'completed', approved: true },
        { status: 'completed', approved: false },
      ],
    });
    expect(p).toBe(15 + 3 + 20);
  });
  it('sube de nivel', () => {
    expect(levelFor(150).name).toBe('Titular');
    expect(levelFor(5000)).toMatchObject({ name: 'Leyenda', next: null, pct: 100 });
  });
});

describe('rachas y logros', () => {
  it('racha de días seguidos (hasta hoy o ayer)', () => {
    expect(currentStreak(['2026-11-11', '2026-11-10', '2026-11-09'], now)).toBe(3);
    expect(currentStreak(['2026-11-10', '2026-11-09'], now)).toBe(2);
    expect(currentStreak(['2026-11-05'], now)).toBe(0);
  });
  it('desbloquea solo lo logrado', () => {
    const a = achievements({ ...empty, sessions: [s('2026-11-10')] }, now);
    expect(a.find((x) => x.code === 'first-session')!.earned).toBe(true);
    expect(a.find((x) => x.code === 'first-match')!.earned).toBe(false);
    expect(achievements(empty, now).every((x) => !x.earned)).toBe(true);
  });
});
