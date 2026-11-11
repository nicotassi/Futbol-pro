import { describe, expect, it } from 'vitest';
import { buildCalendarItems, itemsOn, weekSummary } from './logic';

const base = { sessions: [], workouts: [], matches: [], assessments: [], events: [] };

describe('calendario', () => {
  it('une sesiones, programados, partidos, evaluaciones y eventos; ignora cancelados y plantillas', () => {
    const items = buildCalendarItems({
      sessions: [
        {
          id: '1',
          title: 'Plaza',
          started_at: '2026-11-10T10:00:00',
          status: 'completed',
          actual_minutes: 40,
        },
        {
          id: '2',
          title: 'Cortada',
          started_at: '2026-11-10T10:00:00',
          status: 'abandoned',
          actual_minutes: 5,
        },
      ],
      workouts: [
        {
          id: '3',
          name: 'Técnica',
          scheduled_for: '2026-11-12',
          is_template: false,
          est_minutes: 20,
        },
        { id: '4', name: 'Plantilla', scheduled_for: null, is_template: true, est_minutes: 20 },
      ],
      matches: [{ id: '5', opponent: 'Sur', played_on: '2026-11-08' }],
      assessments: [{ id: '6', test_name: 'Carrera', assessed_on: '2026-11-09' }],
      events: [
        {
          id: '7',
          title: 'Club',
          category: 'club_training',
          event_date: '2026-11-11',
          est_minutes: 60,
          description: null,
          status: 'planned',
        },
        {
          id: '8',
          title: 'Anulado',
          category: 'special',
          event_date: '2026-11-11',
          est_minutes: null,
          description: null,
          status: 'cancelled',
        },
      ],
    });
    expect(items.map((i) => i.title)).toEqual([
      'Partido vs Sur',
      'Carrera',
      'Plaza',
      'Club',
      'Técnica',
    ]);
    expect(itemsOn(items, '2026-11-10')).toHaveLength(1);
    expect(items.find((i) => i.title === 'Club')!.manualId).toBe('7');
  });

  it('resume la semana', () => {
    const items = buildCalendarItems({
      ...base,
      matches: [{ id: '1', opponent: 'A', played_on: '2026-11-08' }],
      events: [
        {
          id: '2',
          title: 'Club',
          category: 'club_training',
          event_date: '2026-11-09',
          est_minutes: null,
          description: null,
          status: 'planned',
        },
        {
          id: '3',
          title: 'Descanso',
          category: 'rest',
          event_date: '2026-11-10',
          est_minutes: null,
          description: null,
          status: 'planned',
        },
      ],
    });
    expect(weekSummary(items, ['2026-11-08', '2026-11-09', '2026-11-10'])).toEqual({
      trainings: 1,
      matches: 1,
      rests: 1,
    });
  });
});
