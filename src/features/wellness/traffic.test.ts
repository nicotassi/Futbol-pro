import { describe, expect, it } from 'vitest';
import { wellnessLight, type WellnessInput } from './traffic';

const base: WellnessInput = {
  sleep_hours: 9.5,
  sleep_quality: 4,
  energy: 4,
  soreness: 2,
  motivation: 5,
  overall: 4,
  hydration: 4,
  pain_level: 0,
  sick: false,
  discomfort: null,
};
const empty: WellnessInput = {
  sleep_hours: null,
  sleep_quality: null,
  energy: null,
  soreness: null,
  motivation: null,
  overall: null,
  hydration: null,
  pain_level: 0,
  sick: false,
  discomfort: null,
};
const w = (o: Partial<WellnessInput>) => ({ ...base, ...o });

// Los mismos casos están en supabase/tests/40_phase4.sql: ambas reglas deben coincidir.
describe('semáforo de bienestar', () => {
  it.each([
    ['todo bien', w({}), 'green'],
    ['un solo dato bueno', { ...empty, overall: 4 }, 'green'],
    ['sin datos', empty, null],
    ['menos de 8 horas de sueño', w({ sleep_hours: 7 }), 'yellow'],
    ['durmió mal', w({ sleep_quality: 2 }), 'yellow'],
    ['poca energía', w({ energy: 2 }), 'yellow'],
    ['mucho cansancio muscular', w({ soreness: 4 }), 'yellow'],
    ['pocas ganas', w({ motivation: 2 }), 'yellow'],
    ['poca hidratación', w({ hydration: 2 }), 'yellow'],
    ['estado general bajo', w({ overall: 2 }), 'yellow'],
    ['dolor leve', w({ pain_level: 1 }), 'yellow'],
    ['molestia anotada', w({ discomfort: 'me duele el tobillo' }), 'yellow'],
    ['molestia en blanco', w({ discomfort: '   ' }), 'green'],
    ['dolor moderado', w({ pain_level: 2 }), 'red'],
    ['dolor fuerte', w({ pain_level: 3 }), 'red'],
    ['enfermo', w({ sick: true }), 'red'],
    ['estado general mínimo', w({ overall: 1 }), 'red'],
    ['dolor fuerte sin otros datos', { ...empty, pain_level: 3 }, 'red'],
  ])('%s', (_n, input, expected) => {
    expect(wellnessLight(input)).toBe(expected);
  });
});
