import { db } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type WellnessLog = Tables<'wellness_logs'>;

export const wellnessKeys = {
  all: (playerId: string) => ['wellness', playerId] as const,
};

export async function fetchWellness(playerId: string, limit = 60): Promise<WellnessLog[]> {
  const { data, error } = await db()
    .from('wellness_logs')
    .select('*')
    .eq('player_id', playerId)
    .order('log_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export interface WellnessPayload {
  player_id: string;
  log_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  energy: number | null;
  soreness: number | null;
  motivation: number | null;
  overall: number | null;
  hydration: number | null;
  pain_level: number;
  sick: boolean;
  discomfort: string;
  notes: string;
  client_id: string;
}

/** Un registro por día: volver a guardar el mismo día lo actualiza. */
export async function sendWellness(p: WellnessPayload): Promise<string> {
  const { data, error } = await db().rpc('save_wellness', {
    p_log: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ''])),
  });
  if (error) throw error;
  return data;
}
