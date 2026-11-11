import { z } from 'zod';

export const POSITIONS = [
  'Arquero',
  'Defensor central',
  'Lateral',
  'Mediocampista',
  'Mediocampista defensivo',
  'Mediocampista ofensivo',
  'Extremo',
  'Delantero',
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v));

/** Validación del formulario de perfil del jugador (coincide con los CHECK de la base). */
export const playerFormSchema = z.object({
  first_name: z.string().trim().min(1, 'Ingresá el nombre.').max(40, 'Máximo 40 caracteres.'),
  last_name: optionalText(60),
  birth_date: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Fecha inválida.')
    .refine(
      (v) => v === '' || (v > '2000-01-01' && v <= new Date().toISOString().slice(0, 10)),
      'La fecha no es válida.',
    )
    .transform((v) => (v === '' ? null : v)),
  position: z.string().trim().min(1, 'Elegí una posición.').max(40),
  dominant_foot: z.enum(['', 'right', 'left', 'both']).transform((v) => (v === '' ? null : v)),
  club: optionalText(80),
  category: optionalText(40),
});

export type PlayerFormInput = z.input<typeof playerFormSchema>;
export type PlayerFormOutput = z.output<typeof playerFormSchema>;
