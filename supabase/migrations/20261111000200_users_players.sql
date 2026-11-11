-- =============================================================================
-- FUTBOLISTA PRO · 0200 · Usuarios, jugadores y accesos
-- =============================================================================

-- Perfil de cada usuario autenticado (1:1 con auth.users).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  username     citext unique check (username ~ '^[a-z0-9_.-]{3,30}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.profiles is 'Perfil básico de cada usuario de la app (papá o jugador).';

-- Jugador (datos personales y deportivos mínimos).
create table public.players (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null check (char_length(first_name) between 1 and 40),
  last_name     text check (char_length(last_name) <= 60),
  birth_date    date check (birth_date > date '2000-01-01'),
  position      text not null default 'Mediocampista' check (char_length(position) <= 40),
  dominant_foot public.dominant_foot,
  club          text check (char_length(club) <= 80),
  category      text check (char_length(category) <= 40),
  avatar_path   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.players is 'Jugadores (player_profiles en la especificación). Sin datos innecesarios: no hay DNI, domicilio ni ubicación.';

-- Quién accede a qué jugador y con qué rol.
create table public.player_access (
  user_id    uuid not null references auth.users (id) on delete cascade,
  player_id  uuid not null references public.players (id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, player_id)
);
create index player_access_player_idx on public.player_access (player_id);
comment on table public.player_access is 'Vincula usuarios con jugadores. role=admin (papá) o player (el propio jugador). Solo el servidor (service_role) lo modifica.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger players_updated_at before update on public.players
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Funciones de permisos (SECURITY DEFINER: consultan player_access sin RLS
-- y evitan recursión en las políticas).
-- ---------------------------------------------------------------------------
create or replace function private.is_member(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.player_access a
    where a.player_id = p_player_id and a.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_admin(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.player_access a
    where a.player_id = p_player_id
      and a.user_id = (select auth.uid())
      and a.role = 'admin'
  );
$$;

-- ¿Comparten algún jugador el usuario actual y otro usuario? (para ver nombres)
create or replace function private.shares_player(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.player_access mine
    join public.player_access theirs on theirs.player_id = mine.player_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

revoke all on function private.is_member(uuid), private.is_admin(uuid), private.shares_player(uuid) from public;
grant execute on function private.is_member(uuid), private.is_admin(uuid), private.shares_player(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Alta automática del perfil al crear un usuario en Auth.
-- Usa raw_user_meta_data solo para el nombre visible y el usuario; los
-- permisos NUNCA salen de metadatos editables por el usuario.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
