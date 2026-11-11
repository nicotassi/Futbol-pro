import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePlayer } from '@/contexts/authContext';
import { usePendingSessions } from '@/features/training/hooks';
import { fetchWellness, wellnessKeys, type WellnessLog, type WellnessPayload } from './api';
import { wellnessLight } from './traffic';

export interface WellnessView extends WellnessLog {
  pending: boolean;
}

function pendingToView(p: WellnessPayload, createdAt: number): WellnessView {
  const ts = new Date(createdAt).toISOString();
  return {
    ...p,
    id: `pendiente-${p.client_id}`,
    discomfort: p.discomfort || null,
    notes: p.notes || null,
    traffic_light: wellnessLight({ ...p, discomfort: p.discomfort }),
    created_by: null,
    created_at: ts,
    updated_at: ts,
    pending: true,
  };
}

/** Bienestar de la base + lo guardado en el celular sin enviar (el del mismo día lo reemplaza). */
export function useWellness() {
  const player = usePlayer();
  const pending = usePendingSessions();
  const query = useQuery({
    queryKey: wellnessKeys.all(player.id),
    queryFn: () => fetchWellness(player.id),
    refetchOnMount: 'always',
  });
  const data = useMemo<WellnessView[] | undefined>(() => {
    if (!query.data && pending.length === 0) return undefined;
    const byDate = new Map<string, WellnessView>(
      (query.data ?? []).map((w) => [w.log_date, { ...w, pending: false }]),
    );
    for (const p of pending) {
      if (p.kind === 'save_wellness' && p.payload.player_id === player.id)
        byDate.set(p.payload.log_date, pendingToView(p.payload, p.createdAt));
    }
    return [...byDate.values()].sort((a, b) => b.log_date.localeCompare(a.log_date));
  }, [query.data, pending, player.id]);
  return { ...query, data };
}
