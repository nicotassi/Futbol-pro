import { FunctionsHttpError } from '@supabase/supabase-js';
import { db } from './supabase';
import { friendlyError } from './errors';

/**
 * Cliente de la Edge Function "family-accounts" (alta de cuentas sin abrir
 * el registro público). La clave secreta vive solo en el servidor.
 */
type Action =
  | { action: 'status' }
  | {
      action: 'bootstrap';
      code: string;
      email: string;
      password: string;
      adminName: string;
      playerName: string;
    }
  | { action: 'create-player-account'; username: string; password: string }
  | { action: 'reset-player-password'; password: string };

export class FamilyApiError extends Error {}

async function call<T extends Record<string, unknown>>(body: Action): Promise<T> {
  const { data, error } = await db().functions.invoke('family-accounts', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new FamilyApiError(payload?.error ?? 'No se pudo completar la operación.');
    }
    throw new FamilyApiError(friendlyError(error));
  }
  return data as T;
}

export const familyApi = {
  status: () => call<{ ok: true; configured: boolean }>({ action: 'status' }),
  bootstrap: (input: Omit<Extract<Action, { action: 'bootstrap' }>, 'action'>) =>
    call<{ ok: true }>({ action: 'bootstrap', ...input }),
  createPlayerAccount: (username: string, password: string) =>
    call<{ ok: true; username: string }>({ action: 'create-player-account', username, password }),
  resetPlayerPassword: (password: string) =>
    call<{ ok: true }>({ action: 'reset-player-password', password }),
};

export const familyKeys = { status: ['family-status'] as const };
