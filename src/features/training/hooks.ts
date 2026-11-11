import { useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { outboxSnapshot, subscribeOutbox, type OutboxItem } from '@/services/outbox';
import {
  fetchExercises,
  fetchFavorites,
  fetchSessions,
  fetchWorkouts,
  trainingKeys,
  type Session,
} from './api';

export function useExercises() {
  const player = usePlayer();
  return useQuery({
    queryKey: trainingKeys.exercises(player.id),
    queryFn: () => fetchExercises(player.id),
  });
}

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: trainingKeys.favorites(user?.id ?? ''),
    queryFn: () => fetchFavorites(user!.id),
    enabled: Boolean(user),
  });
}

export function useWorkouts() {
  const player = usePlayer();
  return useQuery({
    queryKey: trainingKeys.workouts(player.id),
    queryFn: () => fetchWorkouts(player.id),
  });
}

/** Registros pendientes de sincronizar del usuario actual. */
export function usePendingSessions(): OutboxItem[] {
  const { user } = useAuth();
  const all = useSyncExternalStore(subscribeOutbox, outboxSnapshot, outboxSnapshot);
  return useMemo(() => all.filter((i) => i.userId === user?.id), [all, user?.id]);
}

export interface SessionView extends Session {
  pending: boolean;
}

/**
 * Sesiones de la base + las guardadas en el celular que todavía no se
 * sincronizaron (marcadas como pendientes).
 */
export function useSessions() {
  const player = usePlayer();
  const pending = usePendingSessions();
  const query = useQuery({
    queryKey: trainingKeys.sessions(player.id),
    queryFn: () => fetchSessions(player.id),
  });
  const data = useMemo<SessionView[] | undefined>(() => {
    if (!query.data && pending.length === 0) return undefined;
    const synced = new Set((query.data ?? []).map((s) => s.client_id));
    const local: SessionView[] = pending
      .filter((p) => !synced.has(p.id) && p.payload.session.player_id === player.id)
      .map((p) => ({
        ...p.payload.session,
        id: `pendiente-${p.id}`,
        created_by: null,
        created_at: new Date(p.createdAt).toISOString(),
        updated_at: new Date(p.createdAt).toISOString(),
        pending: true,
      }));
    return [...local, ...(query.data ?? []).map((s) => ({ ...s, pending: false }))].sort((a, b) =>
      b.started_at.localeCompare(a.started_at),
    );
  }, [query.data, pending, player.id]);
  return { ...query, data };
}
