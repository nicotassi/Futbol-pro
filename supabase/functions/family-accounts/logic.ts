/**
 * Validación de la Edge Function "family-accounts" (sin dependencias de Deno,
 * para poder probarla con Vitest).
 */

// Debe coincidir con src/services/identity.ts (hay un test que lo verifica).
export const PLAYER_EMAIL_DOMAIN = 'jugador.futbolista-pro.app';
export const USERNAME_PATTERN = /^[a-z0-9_.-]{3,30}$/;
export const MIN_PASSWORD = 8;

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function checkPassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (password.length > 72) return 'La contraseña es demasiado larga (máximo 72 caracteres).';
  return null;
}

function checkName(name: string, label: string, max: number): string | null {
  if (name.length < 1) return `Ingresá ${label}.`;
  if (name.length > max)
    return `${label[0]!.toUpperCase()}${label.slice(1)}: máximo ${max} caracteres.`;
  return null;
}

export interface SignupInput {
  email: string;
  password: string;
  adminName: string;
  playerName: string;
}

/** Alta de una familia nueva: cuenta del adulto + jugador. */
export function validateSignup(body: Record<string, unknown>): Result<SignupInput> {
  const email = str(body.email).toLowerCase();
  const adminName = str(body.adminName);
  const playerName = str(body.playerName);
  const n1 = checkName(adminName, 'tu nombre', 60);
  if (n1) return { ok: false, error: n1 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: 'El email no es válido.' };
  if (email.endsWith(`@${PLAYER_EMAIL_DOMAIN}`))
    return { ok: false, error: 'Usá tu email personal.' };
  const pw = checkPassword(body.password);
  if (pw) return { ok: false, error: pw };
  const n2 = checkName(playerName, 'el nombre del jugador', 40);
  if (n2) return { ok: false, error: n2 };
  return { ok: true, data: { email, password: body.password as string, adminName, playerName } };
}

export interface PlayerAccountInput {
  username: string;
  password: string;
}

export function validatePlayerAccount(body: Record<string, unknown>): Result<PlayerAccountInput> {
  const username = str(body.username).toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error:
        'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.',
    };
  }
  const pw = checkPassword(body.password);
  if (pw) return { ok: false, error: pw };
  return { ok: true, data: { username, password: body.password as string } };
}

export function validatePassword(body: Record<string, unknown>): Result<{ password: string }> {
  const pw = checkPassword(body.password);
  return pw ? { ok: false, error: pw } : { ok: true, data: { password: body.password as string } };
}

export const playerEmail = (username: string) => `${username}@${PLAYER_EMAIL_DOMAIN}`;
