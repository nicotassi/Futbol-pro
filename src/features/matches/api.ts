import { db } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Match = Tables<'matches'>;
export type MatchStats = Tables<'match_statistics'>;
export type MatchReflection = Tables<'match_reflections'>;

export interface MatchFull extends Match {
  stats: MatchStats | null;
  reflection: MatchReflection | null;
}

export const matchKeys = {
  all: (playerId: string) => ['matches', playerId] as const,
};

export async function fetchMatches(playerId: string): Promise<MatchFull[]> {
  const client = db();
  const [matches, stats, refl] = await Promise.all([
    client
      .from('matches')
      .select('*')
      .eq('player_id', playerId)
      .eq('removed', false)
      .order('played_on', { ascending: false }),
    client.from('match_statistics').select('*').eq('player_id', playerId),
    client.from('match_reflections').select('*').eq('player_id', playerId),
  ]);
  if (matches.error) throw matches.error;
  if (stats.error) throw stats.error;
  if (refl.error) throw refl.error;
  const sBy = new Map(stats.data.map((s) => [s.match_id, s]));
  const rBy = new Map(refl.data.map((r) => [r.match_id, r]));
  return matches.data.map((m) => ({
    ...m,
    stats: sBy.get(m.id) ?? null,
    reflection: rBy.get(m.id) ?? null,
  }));
}

export const STAT_KEYS = [
  'goals',
  'assists',
  'passes_ok',
  'passes_failed',
  'recoveries',
  'interceptions',
  'shots',
  'shots_on_target',
  'duels_won',
  'losses',
  'fouls',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const REFLECTION_SCALES = [
  'physical',
  'focus',
  'decisions',
  'offered_support',
  'helped_recover',
  'rating',
] as const;
export const REFLECTION_TEXTS = [
  'did_well',
  'to_improve',
  'best_play_what',
  'best_play_decision',
  'best_play_good',
  'best_play_different',
] as const;

export interface MatchPayload {
  match: {
    player_id: string;
    played_on: string;
    opponent: string;
    competition: string;
    goals_for: number | null;
    goals_against: number | null;
    position: string;
    minutes: number | null;
    starter: boolean | null;
    notes: string;
    client_id: string;
  };
  stats: Record<StatKey, number | null>;
  reflection: Record<(typeof REFLECTION_SCALES)[number], number | null> &
    Record<(typeof REFLECTION_TEXTS)[number], string>;
}

const clean = (o: object) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v ?? '']));

/** Guarda el partido (idempotente por client_id: los reintentos no duplican). */
export async function sendMatch(p: MatchPayload): Promise<string> {
  const { data, error } = await db().rpc('save_match', {
    p_match: clean(p.match),
    p_stats: clean(p.stats),
    p_reflection: clean(p.reflection),
  });
  if (error) throw error;
  return data;
}

export async function removeMatch(id: string): Promise<void> {
  const { error } = await db().from('matches').update({ removed: true }).eq('id', id);
  if (error) throw error;
}
