import { describe, expect, it } from 'vitest';
import { buildMatchPayload, emptyMatchForm } from './form';

const today = '2026-11-11';
const build = (patch: (f: ReturnType<typeof emptyMatchForm>) => void) => {
  const f = emptyMatchForm(today);
  f.opponent = 'Club Sur';
  patch(f);
  return buildMatchPayload(f, 'p1', 'c1', today);
};

describe('formulario de partido', () => {
  it('con lo mínimo guarda; lo vacío queda sin registrar (no cero)', () => {
    const r = build(() => {});
    expect('payload' in r && r.payload.stats.goals).toBeNull();
    expect('payload' in r && r.payload.match.goals_for).toBeNull();
    expect('payload' in r && r.payload.match.starter).toBeNull();
  });

  it('un cero escrito se guarda como cero', () => {
    const r = build((f) => (f.stats.goals = '0'));
    expect('payload' in r && r.payload.stats.goals).toBe(0);
  });

  it.each([
    ['rival vacío', (f: ReturnType<typeof emptyMatchForm>) => (f.opponent = ' ')],
    ['fecha futura', (f: ReturnType<typeof emptyMatchForm>) => (f.played_on = '2026-12-01')],
    ['solo un número del resultado', (f: ReturnType<typeof emptyMatchForm>) => (f.goals_for = '2')],
    ['minutos inválidos', (f: ReturnType<typeof emptyMatchForm>) => (f.minutes = '300')],
    ['estadística negativa', (f: ReturnType<typeof emptyMatchForm>) => (f.stats.assists = '-1')],
    ['estadística decimal', (f: ReturnType<typeof emptyMatchForm>) => (f.stats.goals = '1.5')],
    [
      'más tiros al arco que tiros',
      (f: ReturnType<typeof emptyMatchForm>) => {
        f.stats.shots = '2';
        f.stats.shots_on_target = '3';
      },
    ],
  ])('rechaza: %s', (_n, patch) => {
    expect('error' in build(patch)).toBe(true);
  });

  it('titular y resultado', () => {
    const r = build((f) => {
      f.starter = 'yes';
      f.goals_for = '3';
      f.goals_against = '1';
    });
    expect('payload' in r && r.payload.match.starter).toBe(true);
    expect('payload' in r && r.payload.match.goals_for).toBe(3);
  });
});
