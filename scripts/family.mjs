#!/usr/bin/env node
/**
 * FUTBOLISTA PRO · Administración de cuentas (se ejecuta en la computadora de papá).
 *
 *   npm run family -- setup                  Crea las cuentas de papá y del jugador y los vincula.
 *   npm run family -- password <usuario|email>  Cambia una contraseña.
 *   npm run family -- status                 Muestra jugadores y accesos.
 *
 * Requiere el archivo .env.server.local (NUNCA se sube al repositorio) con:
 *   SUPABASE_URL=https://<proyecto>.supabase.co
 *   SUPABASE_SECRET_KEY=<clave secreta o service_role>
 *
 * La clave secreta saltea RLS: no la uses en el frontend ni la compartas.
 */
import { existsSync } from 'node:fs';
import { stdin, stdout, exit, argv, loadEnvFile } from 'node:process';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';

// Debe coincidir con src/services/identity.ts (hay un test que lo verifica).
const PLAYER_EMAIL_DOMAIN = 'jugador.futbolista-pro.app';
const USERNAME_PATTERN = /^[a-z0-9_.-]{3,30}$/;
const MIN_PASSWORD = 8;

// ---------------------------------------------------------------------------
// Entrada por consola
// ---------------------------------------------------------------------------
const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
let muted = false;
const originalWrite = rl._writeToOutput?.bind(rl);
rl._writeToOutput = (text) => {
  if (muted && !text.includes('\n')) stdout.write('*');
  else originalWrite?.(text);
};

function ask(question, { secret = false, fallback } = {}) {
  return new Promise((resolve) => {
    const hint = fallback ? ` (${fallback})` : '';
    rl.question(`${question}${hint}: `, (answer) => {
      muted = false;
      if (secret) stdout.write('\n');
      resolve(answer.trim() || fallback || '');
    });
    muted = secret;
  });
}

async function askRequired(question, validate, options) {
  for (;;) {
    const value = await ask(question, options);
    const problem = validate(value);
    if (!problem) return value;
    console.log(`  ✗ ${problem}`);
  }
}

async function askNewPassword(label) {
  for (;;) {
    const first = await askRequired(
      label,
      (v) => (v.length >= MIN_PASSWORD ? null : `Mínimo ${MIN_PASSWORD} caracteres.`),
      { secret: true },
    );
    const second = await ask('Repetí la contraseña', { secret: true });
    if (first === second) return first;
    console.log('  ✗ Las contraseñas no coinciden.');
  }
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const toEmail = (identifier) => {
  const v = identifier.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${PLAYER_EMAIL_DOMAIN}`;
};

// ---------------------------------------------------------------------------
// Supabase (clave secreta)
// ---------------------------------------------------------------------------
function connect() {
  if (existsSync('.env.server.local')) loadEnvFile('.env.server.local');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      '\nFalta configuración. Creá el archivo .env.server.local con:\n' +
        '  SUPABASE_URL=https://<proyecto>.supabase.co\n' +
        '  SUPABASE_SECRET_KEY=<clave secreta>\n' +
        '(Supabase → Project Settings → API Keys). Ver README, sección "Fase 2".\n',
    );
    exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(supabase, { email, password, displayName, username }) {
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    console.log(`  • Ya existe la cuenta ${email}: se reutiliza (la contraseña no cambia).`);
    return existing;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, ...(username ? { username } : {}) },
  });
  if (error) throw error;
  console.log(`  ✓ Cuenta creada: ${username ? `usuario "${username}"` : email}`);
  return data.user;
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------
async function setup() {
  const supabase = connect();
  console.log('\nFUTBOLISTA PRO · Configuración de la familia\n');

  console.log('Cuenta de papá (administrador)');
  const adminEmail = (
    await askRequired('  Email', (v) => (isEmail(v) ? null : 'Email inválido.'))
  ).toLowerCase();
  const adminName = await ask('  Nombre visible', { fallback: 'Papá' });
  const existingAdmin = await findUserByEmail(supabase, adminEmail);
  const adminPassword = existingAdmin ? '' : await askNewPassword('  Contraseña');

  console.log('\nJugador');
  const firstName = await askRequired(
    '  Nombre',
    (v) => (v.length >= 1 && v.length <= 40 ? null : 'Entre 1 y 40 caracteres.'),
    { fallback: 'Benja' },
  );
  const position = await ask('  Posición', { fallback: 'Mediocampista' });
  const username = (
    await askRequired(
      '  Usuario para ingresar',
      (v) =>
        USERNAME_PATTERN.test(v.toLowerCase())
          ? null
          : '3 a 30 caracteres: letras, números, punto, guion o guion bajo.',
      {
        fallback: firstName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[^a-z0-9]/g, ''),
      },
    )
  ).toLowerCase();
  const playerEmail = `${username}@${PLAYER_EMAIL_DOMAIN}`;
  const existingPlayerUser = await findUserByEmail(supabase, playerEmail);
  const playerPassword = existingPlayerUser ? '' : await askNewPassword('  Contraseña del jugador');

  console.log('\nCreando…');
  const admin =
    existingAdmin ??
    (await ensureUser(supabase, {
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
    }));
  if (existingAdmin) console.log(`  • Ya existe la cuenta ${adminEmail}: se reutiliza.`);
  const playerUser =
    existingPlayerUser ??
    (await ensureUser(supabase, {
      email: playerEmail,
      password: playerPassword,
      displayName: firstName,
      username,
    }));
  if (existingPlayerUser) console.log(`  • Ya existe el usuario "${username}": se reutiliza.`);

  // Jugador: si papá ya administra uno, se reutiliza (evita duplicados al re-ejecutar).
  const { data: adminAccess, error: accessError } = await supabase
    .from('player_access')
    .select('player_id')
    .eq('user_id', admin.id)
    .eq('role', 'admin')
    .limit(1);
  if (accessError) throw accessError;

  let playerId = adminAccess[0]?.player_id;
  if (playerId) {
    console.log('  • Papá ya tiene un jugador vinculado: se reutiliza.');
  } else {
    const { data: player, error } = await supabase
      .from('players')
      .insert({ first_name: firstName, position })
      .select('id')
      .single();
    if (error) throw error;
    playerId = player.id;
    console.log(`  ✓ Jugador creado: ${firstName}`);
  }

  const { error: linkError } = await supabase.from('player_access').upsert(
    [
      { user_id: admin.id, player_id: playerId, role: 'admin' },
      { user_id: playerUser.id, player_id: playerId, role: 'player' },
    ],
    { onConflict: 'user_id,player_id' },
  );
  if (linkError) throw linkError;
  console.log('  ✓ Accesos vinculados');

  console.log(
    `\nListo. Para ingresar:\n  Papá:  ${adminEmail}\n  ${firstName}: usuario "${username}"\n`,
  );
}

async function changePassword(identifier) {
  if (!identifier) {
    console.error('Indicá el usuario o email: npm run family -- password benja');
    exit(1);
  }
  const supabase = connect();
  const email = toEmail(identifier);
  const user = await findUserByEmail(supabase, email);
  if (!user) {
    console.error(`No existe la cuenta ${identifier}.`);
    exit(1);
  }
  const password = await askNewPassword(`Nueva contraseña para ${identifier}`);
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  console.log('✓ Contraseña actualizada.');
}

async function status() {
  const supabase = connect();
  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, position');
  if (error) throw error;
  const { data: access, error: e2 } = await supabase
    .from('player_access')
    .select('player_id, role, user_id');
  if (e2) throw e2;
  const { data: profiles, error: e3 } = await supabase
    .from('profiles')
    .select('id, display_name, username');
  if (e3) throw e3;
  const names = new Map(
    profiles.map((p) => [
      p.id,
      p.username ? `${p.display_name} (usuario: ${p.username})` : p.display_name,
    ]),
  );
  if (players.length === 0) console.log('No hay jugadores. Ejecutá: npm run family -- setup');
  for (const p of players) {
    console.log(`\n${p.first_name} · ${p.position}`);
    for (const a of access.filter((x) => x.player_id === p.id)) {
      console.log(
        `  - ${a.role === 'admin' ? 'Administrador' : 'Jugador'}: ${names.get(a.user_id) ?? a.user_id}`,
      );
    }
  }
  console.log('');
}

const [command, arg] = argv.slice(2);
const commands = {
  setup: () => setup(),
  password: () => changePassword(arg),
  status: () => status(),
};

try {
  if (!commands[command]) {
    console.log(
      'Uso:\n  npm run family -- setup\n  npm run family -- password <usuario|email>\n  npm run family -- status',
    );
  } else {
    await commands[command]();
  }
} catch (error) {
  console.error(`\n✗ Error: ${error?.message ?? error}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
