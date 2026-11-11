/**
 * Inicio de sesión con "usuario" para el jugador.
 *
 * Supabase Auth trabaja con emails. Para que Benja no necesite un email, su
 * usuario (p. ej. "benja") se traduce a un email técnico que nunca recibe
 * correos: benja@jugador.futbolista-pro.app. Papá entra con su email real.
 *
 * IMPORTANTE: scripts/family.mjs usa el mismo dominio (hay un test que lo verifica).
 */
export const PLAYER_EMAIL_DOMAIN = 'jugador.futbolista-pro.app';

export const USERNAME_PATTERN = /^[a-z0-9_.-]{3,30}$/;

export type IdentifierResult = { ok: true; email: string } | { ok: false; error: string };

export function identifierToEmail(identifier: string): IdentifierResult {
  const value = identifier.trim().toLowerCase();
  if (!value) return { ok: false, error: 'Ingresá tu usuario o email.' };
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? { ok: true, email: value }
      : { ok: false, error: 'El email no es válido.' };
  }
  if (!USERNAME_PATTERN.test(value)) {
    return {
      ok: false,
      error: 'El usuario solo puede tener letras, números, punto, guion o guion bajo.',
    };
  }
  return { ok: true, email: `${value}@${PLAYER_EMAIL_DOMAIN}` };
}
