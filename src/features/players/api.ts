import { db } from '@/services/supabase';
import type { Enums, Tables, TablesUpdate } from '@/types/database';

export type Player = Tables<'players'>;
export type Profile = Tables<'profiles'>;
export type AppRole = Enums<'app_role'>;

export interface Membership {
  role: AppRole;
  player: Player;
}

export interface AccessEntry {
  userId: string;
  role: AppRole;
  displayName: string;
  username: string | null;
}

export const playerKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  memberships: (userId: string) => ['memberships', userId] as const,
  access: (playerId: string) => ['player-access', playerId] as const,
};

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await db().from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

/** Jugadores a los que el usuario tiene acceso, con su rol en cada uno. */
export async function fetchMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await db()
    .from('player_access')
    .select('role, player:players(*)')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return (data ?? [])
    .filter((row): row is { role: AppRole; player: Player } => row.player !== null)
    .map((row) => ({ role: row.role, player: row.player }));
}

/** Quiénes tienen acceso al jugador (visible completo solo para el admin, por RLS). */
export async function fetchPlayerAccess(playerId: string): Promise<AccessEntry[]> {
  const client = db();
  const [access, profiles] = await Promise.all([
    client.from('player_access').select('user_id, role').eq('player_id', playerId).order('role'),
    client.from('profiles').select('id, display_name, username'),
  ]);
  if (access.error) throw access.error;
  if (profiles.error) throw profiles.error;
  const byId = new Map(profiles.data.map((p) => [p.id, p]));
  return access.data.map((a) => ({
    userId: a.user_id,
    role: a.role,
    displayName: byId.get(a.user_id)?.display_name ?? 'Usuario',
    username: byId.get(a.user_id)?.username ?? null,
  }));
}

export async function updatePlayer(id: string, patch: TablesUpdate<'players'>): Promise<Player> {
  const { data, error } = await db()
    .from('players')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
