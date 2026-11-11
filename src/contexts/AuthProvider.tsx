import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { db } from '@/services/supabase';
import { identifierToEmail } from '@/services/identity';
import { friendlyError } from '@/services/errors';
import { clearQueryCache } from '@/services/queryClient';
import { fetchMemberships, fetchProfile, playerKeys } from '@/features/players/api';
import { AuthContext, type AuthState, type AuthStatus } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = todavía leyendo la sesión guardada
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const client = db();
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: playerKeys.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
  });

  const membershipsQuery = useQuery({
    queryKey: playerKeys.memberships(userId ?? ''),
    queryFn: () => fetchMemberships(userId!),
    enabled: Boolean(userId),
  });

  const signIn = useCallback(async (identifier: string, password: string) => {
    const parsed = identifierToEmail(identifier);
    if (!parsed.ok) return { error: parsed.error };
    if (!password) return { error: 'Ingresá la contraseña.' };
    const { error } = await db().auth.signInWithPassword({ email: parsed.email, password });
    return { error: error ? friendlyError(error) : null };
  }, []);

  const signOut = useCallback(async () => {
    // Privacidad: en un dispositivo compartido no queda nada guardado.
    await clearQueryCache();
    await db().auth.signOut({ scope: 'local' });
    setSession(null);
  }, []);

  const retry = useCallback(() => {
    void profileQuery.refetch();
    void membershipsQuery.refetch();
  }, [profileQuery, membershipsQuery]);

  const value = useMemo<AuthState>(() => {
    const membership = membershipsQuery.data?.[0] ?? null;
    let status: AuthStatus;
    if (session === undefined) status = 'loading';
    else if (session === null) status = 'signed-out';
    else if (membershipsQuery.data && profileQuery.data)
      status = membership ? 'ready' : 'no-access';
    else if (membershipsQuery.isError || profileQuery.isError) status = 'error';
    else status = 'loading';

    return {
      status,
      user: session?.user ?? null,
      profile: profileQuery.data ?? null,
      player: membership?.player ?? null,
      role: membership?.role ?? null,
      isAdmin: membership?.role === 'admin',
      error: membershipsQuery.error ?? profileQuery.error,
      signIn,
      signOut,
      retry,
    };
  }, [
    session,
    profileQuery.data,
    profileQuery.isError,
    profileQuery.error,
    membershipsQuery.data,
    membershipsQuery.isError,
    membershipsQuery.error,
    signIn,
    signOut,
    retry,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
