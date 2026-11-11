import { z } from 'zod';

const lines = (max: number) =>
  z
    .string()
    .transform((v) =>
      v
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .refine((arr) => arr.length <= max, `Máximo ${max} líneas.`);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v));

/** Validación del formulario de ejercicios (coincide con los CHECK de la base). */
export const exerciseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Ingresá un nombre (mínimo 2 letras).')
    .max(80, 'Máximo 80 caracteres.'),
  category: z.enum(['speed', 'technique', 'strength', 'endurance', 'coordination', 'tactics'], {
    message: 'Elegí una categoría.',
  }),
  objective: optional(300),
  description: optional(2000),
  difficulty: z.coerce.number().int().min(1).max(3),
  est_minutes: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && +v >= 1 && +v <= 120), 'Entre 1 y 120 minutos.')
    .transform((v) => (v === '' ? null : Number(v))),
  materials: z.string().transform((v) =>
    v
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  ),
  steps: lines(20),
  common_mistakes: lines(10),
  precautions: optional(1000),
  result_indicator: optional(200),
  media_url: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^https:\/\/\S+$/.test(v),
      'El enlace tiene que empezar con https://',
    )
    .transform((v) => (v === '' ? null : v)),
});

export type ExerciseFormInput = z.input<typeof exerciseFormSchema>;
