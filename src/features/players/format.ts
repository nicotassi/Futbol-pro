import { ageFrom } from '@/utils/date';
import type { Player } from './api';

export const footLabels = { right: 'Derecho', left: 'Izquierdo', both: 'Ambos' } as const;

/** Fecha 'YYYY-MM-DD' de la base → Date local (sin desfase de zona horaria). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function playerAge(player: Pick<Player, 'birth_date'>, today = new Date()): number | null {
  return player.birth_date ? ageFrom(parseDateOnly(player.birth_date), today) : null;
}

/** "Mediocampista · 11 años" (la edad solo si hay fecha de nacimiento cargada). */
export function playerSubtitle(
  player: Pick<Player, 'position' | 'birth_date'>,
  today = new Date(),
): string {
  const age = playerAge(player, today);
  return age === null ? player.position : `${player.position} · ${age} años`;
}
