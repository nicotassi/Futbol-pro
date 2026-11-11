-- =============================================================================
-- FUTBOLISTA PRO · Paso 2: vincular la familia
-- =============================================================================
-- Antes de ejecutar esto, creá las dos cuentas en Supabase →
-- Authentication → Users → "Add user" → "Create new user" (con "Auto Confirm User"):
--   * La tuya, con tu email.
--   * La de Benja, con el email  benja@jugador.futbolista-pro.app
--     (no es un email real: es la forma en que la app guarda su usuario "benja").
--
-- Después:
--   1. Cambiá SOLO los 4 valores entre comillas de la sección "COMPLETAR".
--   2. Copiá todo, pegalo en SQL Editor → New query y apretá "Run".
-- Se puede ejecutar más de una vez sin duplicar nada.
-- =============================================================================

do $$
declare
  -- ======================= COMPLETAR =======================
  email_papa      text := 'tu-email@ejemplo.com';   -- el email con el que creaste tu cuenta
  nombre_papa     text := 'Papá';                   -- cómo querés que te salude la app
  usuario_jugador text := 'benja';                  -- el usuario con el que entra Benja
  nombre_jugador  text := 'Benja';                  -- nombre del jugador
  -- =========================================================

  id_papa    uuid;
  id_jugador uuid;
  id_player  uuid;
begin
  usuario_jugador := lower(trim(usuario_jugador));
  email_papa := lower(trim(email_papa));

  select id into id_papa from auth.users where lower(email) = email_papa;
  if id_papa is null then
    raise exception 'No encontré la cuenta "%". Revisá que la hayas creado en Authentication → Users y que el email esté bien escrito.', email_papa;
  end if;

  select id into id_jugador from auth.users
  where lower(email) = usuario_jugador || '@jugador.futbolista-pro.app';
  if id_jugador is null then
    raise exception 'No encontré la cuenta del jugador. Creala en Authentication → Users con el email %@jugador.futbolista-pro.app', usuario_jugador;
  end if;

  -- Nombres visibles y usuario
  update public.profiles set display_name = nombre_papa where id = id_papa;
  update public.profiles set display_name = nombre_jugador, username = usuario_jugador where id = id_jugador;

  -- Jugador (si ya existe uno vinculado a papá, se reutiliza)
  select player_id into id_player from public.player_access
  where user_id = id_papa and role = 'admin' limit 1;

  if id_player is null then
    insert into public.players (first_name) values (nombre_jugador) returning id into id_player;
  end if;

  -- Accesos
  insert into public.player_access (user_id, player_id, role) values
    (id_papa, id_player, 'admin'),
    (id_jugador, id_player, 'player')
  on conflict (user_id, player_id) do update set role = excluded.role;

  raise notice 'Listo: % (administrador) y % (jugador) vinculados.', nombre_papa, nombre_jugador;
end $$;

select p.display_name as nombre,
       coalesce(p.username, u.email) as ingresa_con,
       case a.role when 'admin' then 'Administrador' else 'Jugador' end as rol
from public.player_access a
join public.profiles p on p.id = a.user_id
join auth.users u on u.id = a.user_id
order by a.role;
