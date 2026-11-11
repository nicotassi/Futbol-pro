import { describe, expect, it } from 'vitest';
import { latestByDimension, statusForProgress } from './logic';
import type { Assessment } from './api';

const a = (o: Partial<Assessment>) =>
  ({ dimension: 'speed', score: null, assessed_on: '2026-01-01', ...o }) as Assessment;

describe('estado según progreso', () => {
  it('0 pendiente, 1-99 en curso, 100 completado', () => {
    expect(statusForProgress(0)).toBe('pending');
    expect(statusForProgress(1)).toBe('in_progress');
    expect(statusForProgress(99)).toBe('in_progress');
    expect(statusForProgress(100)).toBe('completed');
  });
});

describe('evaluaciones por dimensión', () => {
  it('toma la última y calcula la variación', () => {
    const m = latestByDimension([
      a({ assessed_on: '2026-10-01', score: 5 }),
      a({ assessed_on: '2026-11-01', score: 7 }),
      a({ dimension: 'control', assessed_on: '2026-11-02', score: 6 }),
    ]);
    expect(m.get('speed')?.latest.score).toBe(7);
    expect(m.get('speed')?.delta).toBe(2);
    expect(m.get('control')?.delta).toBeNull();
    expect(m.size).toBe(2);
  });
});
