import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AppRole, Player, Profile } from '@/features/players/api';

export type AuthStatus =
  | 'loading' // leyendo la sesión guardada
  | 'signed-out' // sin sesión
  | 'no-access' // sesión válida pero sin jugador vinculado
  | 'error' // no se pudieron cargar los datos y no hay caché
  | 'ready';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  /** Jugador activo (la app hoy maneja un jugador por familia). */
  player: Player | null;
  role: AppRole | null;
  isAdmin: boolean;
  error: unknown;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  retry: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}

/** Jugador activo. Solo usar dentro de rutas protegidas (RequireAuth garantiza que existe). */
export function usePlayer(): Player {
  const { player } = useAuth();
  if (!player) throw new Error('usePlayer se usó fuera de una ruta protegida.');
  return player;
}
