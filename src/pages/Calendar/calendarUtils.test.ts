import { describe, expect, it } from 'vitest';
import { isMonday, isSunday } from 'date-fns';
import { monthGrid, weekDays } from './calendarUtils';

describe('monthGrid', () => {
  it('arma semanas completas de lunes a domingo', () => {
    const grid = monthGrid(new Date(2026, 10, 10)); // noviembre 2026
    expect(grid.length % 7).toBe(0);
    expect(isMonday(grid[0]!)).toBe(true);
    expect(isSunday(grid[grid.length - 1]!)).toBe(true);
  });
});

describe('weekDays', () => {
  it('devuelve 7 días empezando en lunes', () => {
    const days = weekDays(new Date(2026, 10, 12));
    expect(days).toHaveLength(7);
    expect(isMonday(days[0]!)).toBe(true);
  });
});
