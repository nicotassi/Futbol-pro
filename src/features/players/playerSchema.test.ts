import { describe, expect, it } from 'vitest';
import { playerFormSchema } from './playerSchema';

const base = {
  first_name: 'Benja',
  last_name: '',
  birth_date: '',
  position: 'Mediocampista',
  dominant_foot: '' as const,
  club: '',
  category: '',
};

describe('playerFormSchema', () => {
  it('convierte campos vacíos en null', () => {
    const r = playerFormSchema.parse(base);
    expect(r).toMatchObject({
      first_name: 'Benja',
      last_name: null,
      birth_date: null,
      dominant_foot: null,
      club: null,
    });
  });

  it('exige nombre', () => {
    const r = playerFormSchema.safeParse({ ...base, first_name: '  ' });
    expect(r.success).toBe(false);
  });

  it('rechaza fechas futuras o muy antiguas', () => {
    expect(playerFormSchema.safeParse({ ...base, birth_date: '2999-01-01' }).success).toBe(false);
    expect(playerFormSchema.safeParse({ ...base, birth_date: '1990-01-01' }).success).toBe(false);
    expect(playerFormSchema.safeParse({ ...base, birth_date: '2015-03-01' }).success).toBe(true);
  });
});
