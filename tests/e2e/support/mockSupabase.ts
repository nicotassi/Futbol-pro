/**
 * Simulación de Supabase (Auth + REST) para los tests de interfaz.
 *
 * IMPORTANTE: esto prueba la INTERFAZ (login, rutas protegidas, roles,
 * formularios). Los permisos reales los garantiza la base de datos y se
 * prueban con `npm run db:test` sobre PostgreSQL. La simulación replica esas
 * reglas para que la interfaz reciba las mismas respuestas que en producción.
 */
import type { Page, Route } from '@playwright/test';

export const SUPABASE_URL = 'http://127.0.0.1:54321';
export const PLAYER_ID = '10000000-0000-4000-8000-000000000001';

export const accounts = {
  admin: {
    id: '00000000-0000-4000-8000-00000000000a',
    email: 'papa@example.com',
    password: 'papa-secreta-1',
    display_name: 'Nico',
    username: null as string | null,
    role: 'admin' as const,
    login: 'papa@example.com',
  },
  player: {
    id: '00000000-0000-4000-8000-00000000000b',
    email: 'benja@jugador.futbolista-pro.app',
    password: 'benja-pro-2026',
    display_name: 'Benja',
    username: 'benja' as string | null,
    role: 'player' as const,
    login: 'Benja',
  },
};
type Account = Omit<(typeof accounts)['admin'], 'role'> & { role: 'admin' | 'player' };

const now = new Date().toISOString();

function makePlayer() {
  return {
    id: PLAYER_ID,
    first_name: 'Benja',
    last_name: null as string | null,
    birth_date: '2015-03-01' as string | null,
    position: 'Mediocampista',
    dominant_foot: null as string | null,
    club: 'Club Atlético' as string | null,
    category: '2015' as string | null,
    avatar_path: null,
    created_at: now,
    updated_at: now,
  };
}

const b64url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function sessionFor(user: Account) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: user.id, role: 'authenticated', exp, aud: 'authenticated', email: user.email })}.firma-de-prueba`;
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: `refresh-${user.id}`,
    user: authUser(user),
  };
}

function authUser(user: Account) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    app_metadata: { provider: 'email' },
    user_metadata: { display_name: user.display_name, username: user.username },
    created_at: now,
  };
}

interface MockOptions {
  /** false = todavía no hay cuentas (familia nueva que se registra). */
  configured?: boolean;
  /** false = papá todavía no creó la cuenta del jugador. */
  playerAccount?: boolean;
}

export async function mockSupabase(page: Page, options: MockOptions = {}) {
  const { configured = true, playerAccount = true } = options;
  const state = {
    player: makePlayer(),
    patches: [] as unknown[],
    serverDown: false,
    requestsWhileDown: 0,
  };
  // Copias mutables de las cuentas existentes en esta simulación.
  const all: Account[] = configured
    ? Object.values(accounts)
        .filter((a) => playerAccount || a.role !== 'player')
        .map((a) => ({ ...a }))
    : [];

  const requester = (route: Route): Account | undefined => {
    const auth = route.request().headers()['authorization'] ?? '';
    const payload = auth.replace(/^Bearer /, '').split('.')[1];
    if (!payload) return undefined;
    try {
      const { sub } = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return all.find((a) => a.id === sub);
    } catch {
      return undefined;
    }
  };

  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    });

  const eq = (url: URL, column: string) => url.searchParams.get(column)?.replace(/^eq\./, '');

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();

    // Servidor caído / sin conexión: ninguna respuesta.
    if (state.serverDown) {
      state.requestsWhileDown++;
      return route.abort('internetdisconnected');
    }

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        },
      });
    }

    // ---------------------------------------------------------------- Auth
    if (url.pathname === '/auth/v1/token') {
      const body = req.postDataJSON() as {
        email?: string;
        password?: string;
        refresh_token?: string;
      };
      if (url.searchParams.get('grant_type') === 'password') {
        const user = all.find(
          (a) => a.email === body.email?.toLowerCase() && a.password === body.password,
        );
        if (!user) {
          return json(route, 400, {
            code: 400,
            error_code: 'invalid_credentials',
            msg: 'Invalid login credentials',
          });
        }
        return json(route, 200, sessionFor(user));
      }
      const user = all.find((a) => `refresh-${a.id}` === body.refresh_token);
      return user
        ? json(route, 200, sessionFor(user))
        : json(route, 400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    }
    if (url.pathname === '/auth/v1/user') {
      const user = requester(route);
      return user ? json(route, 200, authUser(user)) : json(route, 401, { msg: 'invalid JWT' });
    }
    if (url.pathname === '/auth/v1/logout') {
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    }

    // ------------------------------------------------- Edge Function de cuentas
    if (url.pathname === '/functions/v1/family-accounts') {
      const body = req.postDataJSON() as Record<string, string>;
      const caller = requester(route);
      switch (body.action) {
        case 'signup': {
          if (all.some((a) => a.email === body.email?.toLowerCase())) {
            return json(route, 409, {
              ok: false,
              error: 'Ya existe una cuenta con ese email. Ingresá con tu contraseña.',
            });
          }
          if ((body.password ?? '').length < 8) {
            return json(route, 400, {
              ok: false,
              error: 'La contraseña debe tener al menos 8 caracteres.',
            });
          }
          state.player.first_name = body.playerName ?? 'Benja';
          all.push({
            ...accounts.admin,
            email: body.email!.toLowerCase(),
            password: body.password!,
            display_name: body.adminName!,
            login: body.email!,
          });
          return json(route, 200, { ok: true });
        }
        case 'create-player-account': {
          if (caller?.role !== 'admin')
            return json(route, 403, {
              ok: false,
              error: 'Solo papá puede crear la cuenta del jugador.',
            });
          if (all.some((a) => a.role === 'player'))
            return json(route, 409, { ok: false, error: 'El jugador ya tiene una cuenta.' });
          all.push({
            ...accounts.player,
            username: body.username!,
            email: `${body.username}@jugador.futbolista-pro.app`,
            password: body.password!,
            login: body.username!,
          });
          return json(route, 200, { ok: true, username: body.username });
        }
        case 'reset-player-password': {
          if (caller?.role !== 'admin')
            return json(route, 403, {
              ok: false,
              error: 'Solo papá puede cambiar la contraseña del jugador.',
            });
          const p = all.find((a) => a.role === 'player');
          if (!p)
            return json(route, 404, { ok: false, error: 'El jugador todavía no tiene cuenta.' });
          p.password = body.password!;
          return json(route, 200, { ok: true });
        }
        default:
          return json(route, 400, { ok: false, error: 'Acción desconocida.' });
      }
    }

    // ---------------------------------------------------------------- REST
    const user = requester(route);
    if (!user) return json(route, 401, { code: '42501', message: 'permission denied' });
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const reply = (rows: unknown[]) => {
      if (!single) return json(route, 200, rows);
      if (rows.length !== 1) {
        return json(route, 406, {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        });
      }
      return json(route, 200, rows[0]);
    };

    const profiles = all.map((a) => ({
      id: a.id,
      display_name: a.display_name,
      username: a.username,
      created_at: now,
      updated_at: now,
    }));
    const access = all.map((a) => ({
      user_id: a.id,
      player_id: PLAYER_ID,
      role: a.role,
      created_at: now,
    }));

    switch (url.pathname) {
      case '/rest/v1/profiles': {
        const id = eq(url, 'id');
        return reply(profiles.filter((p) => !id || p.id === id));
      }
      case '/rest/v1/player_access': {
        // RLS: el jugador ve solo su vínculo; papá ve todos los del jugador.
        let rows = access.filter((a) => user.role === 'admin' || a.user_id === user.id);
        const uid = eq(url, 'user_id');
        if (uid) rows = rows.filter((a) => a.user_id === uid);
        const pid = eq(url, 'player_id');
        if (pid) rows = rows.filter((a) => a.player_id === pid);
        const select = url.searchParams.get('select') ?? '';
        if (select.includes('player:players'))
          return reply(rows.map((a) => ({ role: a.role, player: state.player })));
        return reply(rows.map((a) => ({ user_id: a.user_id, role: a.role })));
      }
      case '/rest/v1/players': {
        if (method === 'PATCH') {
          // RLS: solo papá puede editar → para el jugador, 0 filas afectadas.
          if (user.role !== 'admin') return reply([]);
          const patch = req.postDataJSON() as Record<string, unknown>;
          state.patches.push(patch);
          Object.assign(state.player, patch, { updated_at: new Date().toISOString() });
          return reply([state.player]);
        }
        return reply([state.player]);
      }
      default:
        return json(route, 404, { message: `Ruta no simulada: ${url.pathname}` });
    }
  });

  return state;
}

/** Inicia sesión desde la pantalla de ingreso. */
export async function loginAs(page: Page, who: keyof typeof accounts) {
  const account = accounts[who];
  await page.goto('/ingresar');
  await page.getByLabel('Usuario o email').fill(account.login);
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page
    .getByRole('heading', { level: 1, name: /Buen día|Buenas tardes|Buenas noches/ })
    .waitFor();
}
