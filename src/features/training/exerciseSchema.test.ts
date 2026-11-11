import { describe, expect, it } from 'vitest';
import { exerciseFormSchema, type ExerciseFormInput } from './exerciseSchema';

const base: ExerciseFormInput = {
  name: 'Pases largos',
  category: 'technique',
  objective: '',
  description: '',
  difficulty: '2',
  est_minutes: '10',
  materials: 'Pelota, Conos , ',
  steps: 'Paso uno\n\n  Paso dos  ',
  common_mistakes: '',
  precautions: '',
  result_indicator: '',
  media_url: '',
};

describe('exerciseFormSchema', () => {
  it('normaliza listas y vacíos', () => {
    const r = exerciseFormSchema.parse(base);
    expect(r).toMatchObject({
      difficulty: 2,
      est_minutes: 10,
      materials: ['Pelota', 'Conos'],
      steps: ['Paso uno', 'Paso dos'],
      common_mistakes: [],
      objective: null,
      media_url: null,
    });
  });

  it('valida nombre, minutos y enlace', () => {
    expect(exerciseFormSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
    expect(exerciseFormSchema.safeParse({ ...base, est_minutes: '500' }).success).toBe(false);
    expect(
      exerciseFormSchema.safeParse({ ...base, media_url: 'http://inseguro.com' }).success,
    ).toBe(false);
    expect(exerciseFormSchema.safeParse({ ...base, media_url: 'https://youtu.be/x' }).success).toBe(
      true,
    );
  });
});
