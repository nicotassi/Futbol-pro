import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Supabase llama "publishable key" a la antigua "anon key". Ambas son públicas por
// diseño: la seguridad la garantizan las políticas RLS de la base.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'fp-auth',
      },
    })
  : null;

/** Cliente de Supabase; falla con un mensaje claro si falta la configuración. */
export function db(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL y la clave pública).');
  }
  return supabase;
}
