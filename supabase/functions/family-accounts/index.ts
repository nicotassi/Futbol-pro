/**
 * FUTBOLISTA PRO · Edge Function "family-accounts"
 *
 * Crea y administra las cuentas SIN abrir el registro público:
 *   - status                 (público)  ¿La app ya fue configurada?
 *   - bootstrap              (público + código de instalación de un solo uso)
 *                            Crea la cuenta de papá, el jugador y el vínculo.
 *   - create-player-account  (solo papá) Crea el usuario del jugador.
 *   - reset-player-password  (solo papá) Cambia la contraseña del jugador.
 *
 * Usa la clave secreta (service_role), que Supabase inyecta en el entorno de la
 * función: nunca llega al navegador. Se despliega con verify_jwt = false porque
 * "status" y "bootstrap" se usan antes de tener sesión; la identidad de papá se
 * verifica acá mismo en las acciones protegidas.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  playerEmail,
  validateBootstrap,
  validatePassword,
  validatePlayerAccount,
} from './logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
const fail = (status: number, error: string) => reply(status, { ok: false, error });

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function isConfigured(db: SupabaseClient): Promise<boolean> {
  const { count, error } = await db
    .from('player_access')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Devuelve el player_id que administra quien llama, o null. */
async function callerAdminPlayer(
  db: SupabaseClient,
  req: Request,
): Promise<{ userId: string; playerId: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: access } = await db
    .from('player_access')
    .select('player_id')
    .eq('user_id', data.user.id)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();
  return access ? { userId: data.user.id, playerId: access.player_id as string } : null;
}

/** Autoriza la creación de una cuenta para ese email (la base rechaza las demás). */
async function inviteEmail(db: SupabaseClient, email: string) {
  const { error } = await db
    .from('account_invites')
    .upsert({ email, expires_at: new Date(Date.now() + 2 * 60_000).toISOString() });
  if (error) throw error;
}

async function bootstrap(db: SupabaseClient, body: Record<string, unknown>) {
  const input = validateBootstrap(body);
  if (!input.ok) return fail(400, input.error);
  const { code, email, password, adminName, playerName } = input.data;

  if (await isConfigured(db))
    return fail(409, 'La app ya está configurada. Ingresá con tu cuenta.');

  const { data: valid, error: codeError } = await db.rpc('consume_setup_code', { p_code: code });
  if (codeError) throw codeError;
  if (!valid) return fail(403, 'El código de instalación no es válido, ya se usó o venció.');

  let createdUserId: string | null = null;
  try {
    await inviteEmail(db, email);
    const { data: created, error: userError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { fp_invited: true },
      user_metadata: { display_name: adminName },
    });
    if (userError) {
      if (/already|registered|exists/i.test(userError.message)) {
        throw new UserFacingError('Ya existe una cuenta con ese email.');
      }
      throw userError;
    }
    createdUserId = created.user.id;

    const { data: player, error: playerError } = await db
      .from('players')
      .insert({ first_name: playerName })
      .select('id')
      .single();
    if (playerError) throw playerError;

    const { error: accessError } = await db
      .from('player_access')
      .insert({ user_id: createdUserId, player_id: player.id, role: 'admin' });
    if (accessError) throw accessError;

    return reply(200, { ok: true });
  } catch (error) {
    // Deshacer para poder reintentar con el mismo código.
    if (createdUserId) await db.auth.admin.deleteUser(createdUserId);
    await db.rpc('release_setup_code', { p_code: code });
    throw error;
  }
}

async function createPlayerAccount(
  db: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
) {
  const caller = await callerAdminPlayer(db, req);
  if (!caller) return fail(403, 'Solo papá puede crear la cuenta del jugador.');
  const input = validatePlayerAccount(body);
  if (!input.ok) return fail(400, input.error);

  const { count } = await db
    .from('player_access')
    .select('user_id', { count: 'exact', head: true })
    .eq('player_id', caller.playerId)
    .eq('role', 'player');
  if ((count ?? 0) > 0)
    return fail(409, 'El jugador ya tiene una cuenta. Podés cambiarle la contraseña.');

  const { data: player, error: playerError } = await db
    .from('players')
    .select('first_name')
    .eq('id', caller.playerId)
    .single();
  if (playerError) throw playerError;

  await inviteEmail(db, playerEmail(input.data.username));
  const { data: created, error: userError } = await db.auth.admin.createUser({
    email: playerEmail(input.data.username),
    password: input.data.password,
    email_confirm: true,
    app_metadata: { fp_invited: true },
    user_metadata: { display_name: player.first_name, username: input.data.username },
  });
  if (userError) {
    if (/already|registered|exists/i.test(userError.message))
      return fail(409, 'Ese usuario ya existe. Elegí otro.');
    throw userError;
  }

  const { error: accessError } = await db
    .from('player_access')
    .insert({ user_id: created.user.id, player_id: caller.playerId, role: 'player' });
  if (accessError) {
    await db.auth.admin.deleteUser(created.user.id);
    throw accessError;
  }
  return reply(200, { ok: true, username: input.data.username });
}

async function resetPlayerPassword(
  db: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
) {
  const caller = await callerAdminPlayer(db, req);
  if (!caller) return fail(403, 'Solo papá puede cambiar la contraseña del jugador.');
  const input = validatePassword(body);
  if (!input.ok) return fail(400, input.error);

  const { data: access } = await db
    .from('player_access')
    .select('user_id')
    .eq('player_id', caller.playerId)
    .eq('role', 'player')
    .limit(1)
    .maybeSingle();
  if (!access) return fail(404, 'El jugador todavía no tiene cuenta.');

  const { error } = await db.auth.admin.updateUserById(access.user_id as string, {
    password: input.data.password,
  });
  if (error) throw error;
  return reply(200, { ok: true });
}

class UserFacingError extends Error {}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'Método no permitido.');

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, 'Solicitud inválida.');
  }

  try {
    const db = serviceClient();
    switch (body.action) {
      case 'status':
        return reply(200, { ok: true, configured: await isConfigured(db) });
      case 'bootstrap':
        return await bootstrap(db, body);
      case 'create-player-account':
        return await createPlayerAccount(db, req, body);
      case 'reset-player-password':
        return await resetPlayerPassword(db, req, body);
      default:
        return fail(400, 'Acción desconocida.');
    }
  } catch (error) {
    if (error instanceof UserFacingError) return fail(409, error.message);
    console.error('family-accounts', error);
    return fail(500, 'No se pudo completar la operación. Intentá de nuevo.');
  }
});
