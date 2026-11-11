import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePlayer } from '@/contexts/authContext';
import { usePendingSessions } from '@/features/training/hooks';
import { fetchMatches, matchKeys, type MatchFull, type MatchPayload } from './api';

export interface MatchView extends MatchFull {
  pending: boolean;
}

/** Convierte lo guardado en el celular (pendiente de enviar) en un partido visible. */
export function pendingToView(payload: MatchPayload, createdAt: number): MatchView {
  const ts = new Date(createdAt).toISOString();
  return {
    ...payload.match,
    id: `pendiente-${payload.match.client_id}`,
    removed: false,
    created_by: null,
    created_at: ts,
    updated_at: ts,
    stats: { match_id: '', player_id: payload.match.player_id, ...payload.stats },
    reflection: { match_id: '', player_id: payload.match.player_id, ...payload.reflection },
    pending: true,
  };
}

/** Partidos de la base + los guardados en el celular que todavía no se enviaron. */
export function useMatches() {
  const player = usePlayer();
  const pending = usePendingSessions();
  const query = useQuery({
    queryKey: matchKeys.all(player.id),
    queryFn: () => fetchMatches(player.id),
    refetchOnMount: 'always',
  });
  const data = useMemo<MatchView[] | undefined>(() => {
    if (!query.data && pending.length === 0) return undefined;
    const local = new Map(
      pending.flatMap((p) =>
        p.kind === 'save_match' && p.payload.match.player_id === player.id
          ? [[p.id, pendingToView(p.payload, p.createdAt)] as const]
          : [],
      ),
    );
    const synced = (query.data ?? []).map((m) => {
      const edited = local.get(m.client_id);
      local.delete(m.client_id);
      return edited ?? { ...m, pending: false };
    });
    return [...local.values(), ...synced].sort(
      (a, b) => b.played_on.localeCompare(a.played_on) || b.created_at.localeCompare(a.created_at),
    );
  }, [query.data, pending, player.id]);
  return { ...query, data };
}
