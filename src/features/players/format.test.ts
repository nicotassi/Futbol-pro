import { describe, expect, it } from 'vitest';
import { parseDateOnly, playerSubtitle } from './format';

describe('playerSubtitle', () => {
  it('incluye la edad cuando hay fecha de nacimiento', () => {
    expect(
      playerSubtitle(
        { position: 'Mediocampista', birth_date: '2015-03-01' },
        new Date(2026, 10, 10),
      ),
    ).toBe('Mediocampista · 11 años');
  });
  it('sin fecha muestra solo la posición', () => {
    expect(playerSubtitle({ position: 'Mediocampista', birth_date: null })).toBe('Mediocampista');
  });
});

describe('parseDateOnly', () => {
  it('no se corre de día por la zona horaria', () => {
    const d = parseDateOnly('2015-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2015, 2, 1]);
  });
});
