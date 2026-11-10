import { describe, expect, it } from 'vitest';
import { formatClock, greetingFor, ageFrom } from './date';

describe('greetingFor', () => {
  it('saluda según la hora', () => {
    expect(greetingFor(new Date(2026, 0, 1, 8))).toBe('Buen día');
    expect(greetingFor(new Date(2026, 0, 1, 15))).toBe('Buenas tardes');
    expect(greetingFor(new Date(2026, 0, 1, 22))).toBe('Buenas noches');
    expect(greetingFor(new Date(2026, 0, 1, 3))).toBe('Buenas noches');
  });
});

describe('formatClock', () => {
  it('formatea mm:ss y h:mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-4)).toBe('00:00');
  });
});

describe('ageFrom', () => {
  it('calcula la edad cumplida', () => {
    expect(ageFrom(new Date(2015, 5, 20), new Date(2026, 5, 19))).toBe(10);
    expect(ageFrom(new Date(2015, 5, 20), new Date(2026, 5, 20))).toBe(11);
  });
});
