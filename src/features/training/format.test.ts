import { describe, expect, it } from 'vitest';
import { weeklySummary } from './format';

describe('weeklySummary', () => {
  it('cuenta solo sesiones completadas desde el lunes', () => {
    const now = new Date(2026, 10, 12, 12); // jueves 12/11/2026
    const r = weeklySummary(
      [
        {
          started_at: new Date(2026, 10, 9, 18).toISOString(),
          actual_minutes: 30,
          status: 'completed',
        }, // lunes
        {
          started_at: new Date(2026, 10, 11, 18).toISOString(),
          actual_minutes: 45,
          status: 'completed',
        },
        {
          started_at: new Date(2026, 10, 8, 18).toISOString(),
          actual_minutes: 60,
          status: 'completed',
        }, // domingo anterior
        {
          started_at: new Date(2026, 10, 10, 18).toISOString(),
          actual_minutes: 20,
          status: 'abandoned',
        },
      ],
      now,
    );
    expect(r).toEqual({ sessions: 2, minutes: 75 });
  });
});
