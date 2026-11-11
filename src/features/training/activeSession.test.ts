import { describe, expect, it } from 'vitest';
import {
  buildSessionPayload,
  completeSet,
  createActiveSession,
  elapsedMinutes,
  goTo,
  toggleCompleted,
} from './activeSession';
import type { Exercise, WorkoutWithItems } from './api';

const ex = (id: string, name: string) =>
  ({ id, name, objective: null, steps: ['Paso 1'] }) as unknown as Exercise;

const workout = {
  id: 'w1',
  name: 'Coordinación + técnica',
  items: [
    {
      id: 'i1',
      exercise_id: 'e1',
      sets: 3,
      reps: 10,
      duration_sec: null,
      rest_sec: 30,
      instructions: null,
    },
    {
      id: 'i2',
      exercise_id: 'e2',
      sets: null,
      reps: null,
      duration_sec: 300,
      rest_sec: null,
      instructions: 'Suave',
    },
  ],
} as unknown as WorkoutWithItems;

const start = new Date('2026-11-11T10:00:00Z');
const base = () =>
  createActiveSession(workout, [ex('e1', 'Sentadillas'), ex('e2', 'Trote')], {
    clientId: 'c1',
    userId: 'u1',
    playerId: 'p1',
    now: start,
  });

describe('sesión activa', () => {
  it('arma los ejercicios con sus nombres y objetivos', () => {
    const s = base();
    expect(s.items.map((i) => i.name)).toEqual(['Sentadillas', 'Trote']);
    expect(s.index).toBe(0);
  });

  it('cada serie suma, inicia el descanso y al completar todas marca el ejercicio', () => {
    let s = completeSet(base(), 1000);
    expect(s.items[0]!.setsDone).toBe(1);
    expect(s.restEndsAt).toBe(31000);
    s = completeSet(completeSet(s, 2000), 3000);
    expect(s.items[0]!.setsDone).toBe(3);
    expect(s.items[0]!.completed).toBe(true);
    expect(s.restEndsAt).toBeNull(); // sin descanso después de la última serie
    expect(completeSet(s).items[0]!.setsDone).toBe(3); // no pasa del objetivo
  });

  it('un ejercicio sin series se completa en una sola marca', () => {
    const s = completeSet(goTo(base(), 1));
    expect(s.items[1]!.completed).toBe(true);
  });

  it('se puede marcar o desmarcar un ejercicio a mano', () => {
    const s = toggleCompleted(base(), 1);
    expect(s.items[1]!.completed).toBe(true);
    expect(toggleCompleted(s, 1).items[1]!.completed).toBe(false);
  });

  it('la navegación no se sale de los límites', () => {
    expect(goTo(base(), 9).index).toBe(1);
    expect(goTo(base(), -2).index).toBe(0);
  });

  it('propone la duración real según el tiempo transcurrido', () => {
    expect(elapsedMinutes(base(), new Date('2026-11-11T10:31:20Z'))).toBe(31);
  });

  it('arma el registro final para la base', () => {
    const s = completeSet(goTo(base(), 1));
    const payload = buildSessionPayload(
      s,
      {
        actualMinutes: 28,
        rpe: 6,
        postState: 4,
        notes: '  Bien  ',
        watch: { hr_avg: 140, calories: 300 },
      },
      new Date('2026-11-11T10:30:00Z'),
    );
    expect(payload.session).toMatchObject({
      client_id: 'c1',
      template_id: 'w1',
      actual_minutes: 28,
      rpe: 6,
      hr_avg: 140,
      calories: 300,
      notes: 'Bien',
      status: 'completed',
    });
    expect(payload.results).toEqual([
      {
        workout_item_id: 'i1',
        exercise_id: 'e1',
        completed: false,
        sets_done: null,
        reps_done: 10,
      },
      { workout_item_id: 'i2', exercise_id: 'e2', completed: true, sets_done: 1, reps_done: null },
    ]);
  });
});
