import { describe, expect, it } from 'vitest';
import { resultLabel, seasonSummary } from './stats';
import type { MatchFull } from './api';

const m = (o: Partial<MatchFull>) =>
  ({ minutes: null, stats: null, reflection: null, ...o }) as MatchFull;

describe('resumen de temporada', () => {
  it('sin partidos: todo vacío', () => {
    const s = seasonSummary([]);
    expect(s.matches).toBe(0);
    expect(s.goals).toBeNull();
    expect(s.passAccuracy).toBeNull();
  });

  it('lo no registrado no cuenta como cero', () => {
    const s = seasonSummary([m({ stats: { goals: null } as MatchFull['stats'] }), m({})]);
    expect(s.goals).toBeNull();
    expect(s.matches).toBe(2);
  });

  it('suma solo lo registrado', () => {
    const s = seasonSummary([
      m({ minutes: 40, stats: { goals: 1, assists: null } as MatchFull['stats'] }),
      m({ minutes: 30, stats: { goals: 2, assists: 1 } as MatchFull['stats'] }),
      m({}),
    ]);
    expect(s.goals).toBe(3);
    expect(s.assists).toBe(1);
    expect(s.minutes).toBe(70);
  });

  it('precisión de pases y promedio de autoevaluación', () => {
    const s = seasonSummary([
      m({
        stats: { passes_ok: 15, passes_failed: 5 } as MatchFull['stats'],
        reflection: { rating: 4 } as MatchFull['reflection'],
      }),
      m({ reflection: { rating: 5 } as MatchFull['reflection'] }),
    ]);
    expect(s.passAccuracy).toBe(75);
    expect(s.avgRating).toBe(4.5);
  });
});

describe('resultado', () => {
  it('ganó, empató, perdió o sin dato', () => {
    expect(resultLabel({ goals_for: 3, goals_against: 1 })).toEqual({
      score: '3 - 1',
      outcome: 'Ganó',
    });
    expect(resultLabel({ goals_for: 1, goals_against: 1 })?.outcome).toBe('Empató');
    expect(resultLabel({ goals_for: 0, goals_against: 2 })?.outcome).toBe('Perdió');
    expect(resultLabel({ goals_for: null, goals_against: 2 })).toBeNull();
  });
});
