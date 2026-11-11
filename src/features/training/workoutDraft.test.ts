import { describe, expect, it } from 'vitest';
import { estimateMinutes, validateWorkout } from './workoutDraft';
import type { Exercise, WorkoutDraft, WorkoutItemDraft } from './api';

const item = (p: Partial<WorkoutItemDraft>): WorkoutItemDraft => ({
  exercise_id: 'e1',
  sets: null,
  reps: null,
  duration_sec: null,
  rest_sec: null,
  instructions: '',
  ...p,
});
const lib = new Map([['e1', { id: 'e1', est_minutes: 8 } as Exercise]]);

describe('estimateMinutes', () => {
  it('suma duraciones, series y descansos', () => {
    expect(estimateMinutes([item({ duration_sec: 300 })], lib)).toBe(5);
    expect(estimateMinutes([item({ sets: 3, duration_sec: 30, rest_sec: 30 })], lib)).toBe(3); // 90 s + 60 s
    expect(estimateMinutes([item({})], lib)).toBe(8); // usa la biblioteca
  });
});

describe('validateWorkout', () => {
  const draft: WorkoutDraft = {
    name: 'Técnica',
    objective: '',
    notes: '',
    est_minutes: 30,
    is_template: true,
    scheduled_for: null,
    items: [item({ sets: 3 })],
  };

  it('acepta un entrenamiento válido', () => {
    expect(validateWorkout(draft)).toEqual([]);
  });

  it('explica cada problema', () => {
    const errors = validateWorkout({ ...draft, name: 'T', items: [], is_template: false });
    expect(errors).toEqual([
      'El nombre debe tener entre 2 y 80 caracteres.',
      'Agregá al menos un ejercicio.',
      'Elegí la fecha del entrenamiento.',
    ]);
    expect(validateWorkout({ ...draft, items: [item({ sets: 0 })] })).toEqual([
      'Ejercicio 1: las series van de 1 a 50.',
    ]);
  });
});
