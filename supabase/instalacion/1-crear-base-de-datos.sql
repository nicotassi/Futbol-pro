-- =============================================================================
-- FUTBOLISTA PRO · Paso 1: crear la base de datos
-- =============================================================================
-- Copiá TODO este archivo, pegalo en Supabase → SQL Editor → New query
-- y apretá "Run". Se ejecuta UNA sola vez en un proyecto nuevo.
--
-- Archivo generado automáticamente con: npm run db:bundle
-- (no editar a mano: la fuente son los archivos de supabase/migrations/)
-- =============================================================================

begin;

-- >>>>> 20261111000100_base.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0100 · Base: esquemas, extensiones, tipos y utilidades
-- =============================================================================
-- Convenciones:
--   * Todas las tablas de datos deportivos tienen `player_id` (preparado para más
--     de un jugador sin rediseñar).
--   * Las tablas hijas repiten `player_id` y lo validan con una FK compuesta
--     (parent_id, player_id) → evita mezclar datos de jugadores distintos y
--     simplifica las políticas RLS.
--   * `private` contiene funciones auxiliares que NO se exponen por la API.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create extension if not exists citext with schema public;

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'player');

create type public.exercise_category as enum (
  'speed', 'technique', 'strength', 'endurance', 'coordination', 'tactics'
);

create type public.session_status as enum ('in_progress', 'completed', 'abandoned');

create type public.goal_status as enum ('pending', 'in_progress', 'completed');

create type public.traffic_light as enum ('green', 'yellow', 'red');

create type public.skill_dimension as enum (
  'control', 'passing', 'speed', 'endurance', 'coordination', 'vision'
);

create type public.calendar_category as enum (
  'club_training', 'extra_training', 'match', 'assessment', 'rest', 'goal', 'special'
);

create type public.event_status as enum ('planned', 'done', 'cancelled');

create type public.dominant_foot as enum ('right', 'left', 'both');

create type public.processing_status as enum ('queued', 'processing', 'done', 'failed');

create type public.review_status as enum ('pending', 'reviewed');

create type public.validation_status as enum ('pending', 'confirmed', 'corrected', 'rejected');

create type public.watch_metric_type as enum (
  'duration', 'heart_rate_avg', 'heart_rate_max', 'hr_zone_1', 'hr_zone_2', 'hr_zone_3',
  'hr_zone_4', 'hr_zone_5', 'calories', 'distance', 'speed_avg', 'speed_max', 'pace_avg',
  'steps', 'activity_datetime', 'activity_type'
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Sin acceso anónimo a nada del esquema public (la app es privada).
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- >>>>> 20261111000200_users_players.sql
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

-- >>>>> 20261111000300_training.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0300 · Entrenamiento: ejercicios, plantillas y sesiones
-- =============================================================================

create table public.exercises (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null references public.players (id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 80),
  category         public.exercise_category not null,
  objective        text check (char_length(objective) <= 300),
  description      text check (char_length(description) <= 2000),
  difficulty       smallint not null default 1 check (difficulty between 1 and 3),
  est_minutes      smallint check (est_minutes between 1 and 120),
  materials        text[] not null default '{}',
  steps            text[] not null default '{}',
  common_mistakes  text[] not null default '{}',
  precautions      text check (char_length(precautions) <= 1000),
  result_indicator text check (char_length(result_indicator) <= 200),
  media_path       text,
  media_url        text check (media_url ~ '^https://'),
  is_custom        boolean not null default true,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, player_id)
);
create index exercises_player_category_idx on public.exercises (player_id, category);

create table public.exercise_favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null,
  player_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, exercise_id),
  foreign key (exercise_id, player_id) references public.exercises (id, player_id) on delete cascade
);

-- Plantillas y entrenamientos programados (is_template distingue ambos).
create table public.workout_templates (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players (id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 80),
  objective     text check (char_length(objective) <= 300),
  notes         text check (char_length(notes) <= 2000),
  est_minutes   smallint check (est_minutes between 1 and 240),
  is_template   boolean not null default true,
  scheduled_for date,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, player_id)
);
create index workout_templates_player_idx on public.workout_templates (player_id, scheduled_for);

create table public.workout_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null,
  player_id    uuid not null,
  exercise_id  uuid not null,
  position     smallint not null check (position >= 0),
  sets         smallint check (sets between 1 and 50),
  reps         smallint check (reps between 1 and 500),
  duration_sec integer check (duration_sec between 1 and 14400),
  rest_sec     integer check (rest_sec between 0 and 3600),
  instructions text check (char_length(instructions) <= 1000),
  unique (template_id, position) deferrable initially deferred,
  unique (id, player_id),
  foreign key (template_id, player_id) references public.workout_templates (id, player_id) on delete cascade,
  foreign key (exercise_id, player_id) references public.exercises (id, player_id) on delete restrict
);

create table public.workout_sessions (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.players (id) on delete cascade,
  template_id    uuid,
  title          text not null check (char_length(title) between 2 and 80),
  started_at     timestamptz not null default now(),
  ended_at       timestamptz check (ended_at is null or ended_at >= started_at),
  status         public.session_status not null default 'in_progress',
  actual_minutes smallint check (actual_minutes between 0 and 600),
  rpe            smallint check (rpe between 1 and 10),
  notes          text check (char_length(notes) <= 2000),
  post_state     smallint check (post_state between 1 and 5),
  -- Identificador generado en el dispositivo: hace idempotentes los reintentos offline.
  client_id      uuid not null unique,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, player_id),
  foreign key (template_id, player_id) references public.workout_templates (id, player_id) on delete set null (template_id)
);
create index workout_sessions_player_started_idx on public.workout_sessions (player_id, started_at desc);

create table public.session_results (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null,
  player_id       uuid not null,
  workout_item_id uuid,
  exercise_id     uuid,
  completed       boolean not null default false,
  sets_done       smallint check (sets_done between 0 and 50),
  reps_done       smallint check (reps_done between 0 and 500),
  value           numeric(10, 2),
  unit            text check (char_length(unit) <= 20),
  notes           text check (char_length(notes) <= 500),
  foreign key (session_id, player_id) references public.workout_sessions (id, player_id) on delete cascade,
  foreign key (workout_item_id, player_id) references public.workout_items (id, player_id) on delete set null (workout_item_id),
  foreign key (exercise_id, player_id) references public.exercises (id, player_id) on delete set null (exercise_id)
);
create index session_results_session_idx on public.session_results (session_id);

create trigger exercises_updated_at before update on public.exercises
  for each row execute function private.set_updated_at();
create trigger workout_templates_updated_at before update on public.workout_templates
  for each row execute function private.set_updated_at();
create trigger workout_sessions_updated_at before update on public.workout_sessions
  for each row execute function private.set_updated_at();

-- >>>>> 20261111000400_performance.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0400 · Partidos, bienestar, objetivos, evaluaciones,
--                         calendario y logros
-- =============================================================================

create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players (id) on delete cascade,
  played_on     date not null,
  opponent      text not null check (char_length(opponent) between 1 and 80),
  competition   text check (char_length(competition) <= 80),
  goals_for     smallint check (goals_for between 0 and 99),
  goals_against smallint check (goals_against between 0 and 99),
  position      text check (char_length(position) <= 40),
  minutes       smallint check (minutes between 0 and 200),
  starter       boolean,
  notes         text check (char_length(notes) <= 2000),
  client_id     uuid not null unique,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, player_id)
);
create index matches_player_date_idx on public.matches (player_id, played_on desc);

-- Estadísticas: NULL = no registrado (nunca se asume cero).
create table public.match_statistics (
  match_id        uuid primary key,
  player_id       uuid not null,
  goals           smallint check (goals >= 0),
  assists         smallint check (assists >= 0),
  passes_ok       smallint check (passes_ok >= 0),
  passes_failed   smallint check (passes_failed >= 0),
  recoveries      smallint check (recoveries >= 0),
  interceptions   smallint check (interceptions >= 0),
  shots           smallint check (shots >= 0),
  shots_on_target smallint check (shots_on_target >= 0),
  duels_won       smallint check (duels_won >= 0),
  losses          smallint check (losses >= 0),
  fouls           smallint check (fouls >= 0),
  updated_at      timestamptz not null default now(),
  check (shots_on_target is null or shots is null or shots_on_target <= shots),
  foreign key (match_id, player_id) references public.matches (id, player_id) on delete cascade
);

create table public.match_reflections (
  match_id            uuid primary key,
  player_id           uuid not null,
  physical            smallint check (physical between 1 and 5),
  focus               smallint check (focus between 1 and 5),
  decisions           smallint check (decisions between 1 and 5),
  offered_support     smallint check (offered_support between 1 and 5),
  helped_recover      smallint check (helped_recover between 1 and 5),
  rating              smallint check (rating between 1 and 5),
  did_well            text check (char_length(did_well) <= 1000),
  to_improve          text check (char_length(to_improve) <= 1000),
  best_play_media     text,
  best_play_what      text check (char_length(best_play_what) <= 1000),
  best_play_decision  text check (char_length(best_play_decision) <= 1000),
  best_play_good      text check (char_length(best_play_good) <= 1000),
  best_play_different text check (char_length(best_play_different) <= 1000),
  updated_at          timestamptz not null default now(),
  foreign key (match_id, player_id) references public.matches (id, player_id) on delete cascade
);

create table public.wellness_logs (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players (id) on delete cascade,
  log_date      date not null,
  sleep_hours   numeric(3, 1) check (sleep_hours between 0 and 16),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  energy        smallint check (energy between 1 and 5),
  soreness      smallint check (soreness between 1 and 5),
  discomfort    text check (char_length(discomfort) <= 500),
  motivation    smallint check (motivation between 1 and 5),
  overall       smallint check (overall between 1 and 5),
  hydration     smallint check (hydration between 1 and 5),
  traffic_light public.traffic_light,
  notes         text check (char_length(notes) <= 1000),
  client_id     uuid not null unique,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (player_id, log_date)
);

create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 100),
  description text check (char_length(description) <= 1000),
  start_date  date not null default current_date,
  target_date date,
  progress    smallint not null default 0 check (progress between 0 and 100),
  status      public.goal_status not null default 'pending',
  notes       text check (char_length(notes) <= 1000),
  approved    boolean not null default false,
  proposed_by uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (target_date is null or target_date >= start_date)
);
create index goals_player_status_idx on public.goals (player_id, status);

create table public.assessments (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.players (id) on delete cascade,
  assessed_on   date not null,
  dimension     public.skill_dimension not null,
  test_name     text not null check (char_length(test_name) between 2 and 80),
  value         numeric(10, 2),
  unit          text check (char_length(unit) <= 20),
  score         smallint check (score between 1 and 10),
  notes         text check (char_length(notes) <= 1000),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index assessments_player_dimension_idx on public.assessments (player_id, dimension, assessed_on);

create table public.calendar_events (
  id                uuid primary key default gen_random_uuid(),
  player_id         uuid not null references public.players (id) on delete cascade,
  title             text not null check (char_length(title) between 2 and 80),
  category          public.calendar_category not null,
  event_date        date not null,
  start_time        time,
  est_minutes       smallint check (est_minutes between 1 and 600),
  description       text check (char_length(description) <= 1000),
  status            public.event_status not null default 'planned',
  linked_session_id uuid,
  linked_match_id   uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (linked_session_id, player_id) references public.workout_sessions (id, player_id) on delete set null (linked_session_id),
  foreign key (linked_match_id, player_id) references public.matches (id, player_id) on delete set null (linked_match_id)
);
create index calendar_events_player_date_idx on public.calendar_events (player_id, event_date);

create table public.achievements (
  id        uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  code      text not null check (char_length(code) between 2 and 60),
  earned_at timestamptz not null default now(),
  unique (player_id, code)
);

-- Puntos de experiencia: una fuente otorga puntos una sola vez.
create table public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete cascade,
  source_type text not null check (char_length(source_type) between 2 and 40),
  source_id   uuid not null,
  points      smallint not null check (points between 0 and 500),
  created_at  timestamptz not null default now(),
  unique (player_id, source_type, source_id)
);

create trigger matches_updated_at before update on public.matches
  for each row execute function private.set_updated_at();
create trigger match_statistics_updated_at before update on public.match_statistics
  for each row execute function private.set_updated_at();
create trigger match_reflections_updated_at before update on public.match_reflections
  for each row execute function private.set_updated_at();
create trigger wellness_logs_updated_at before update on public.wellness_logs
  for each row execute function private.set_updated_at();
create trigger goals_updated_at before update on public.goals
  for each row execute function private.set_updated_at();
create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function private.set_updated_at();

-- >>>>> 20261111000500_watch.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0500 · Registro del reloj (capturas y métricas)
-- =============================================================================

create table public.watch_uploads (
  id                 uuid primary key default gen_random_uuid(),
  player_id          uuid not null references public.players (id) on delete cascade,
  workout_session_id uuid not null,
  image_path         text not null unique,
  original_filename  text check (char_length(original_filename) <= 200),
  image_sha256       text not null check (image_sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by        uuid references auth.users (id) on delete set null,
  uploaded_at        timestamptz not null default now(),
  processing_status  public.processing_status not null default 'queued',
  processing_error   text,
  extracted_data     jsonb,
  review_status      public.review_status not null default 'pending',
  reviewed_by        uuid references auth.users (id) on delete set null,
  reviewed_at        timestamptz,
  -- La misma imagen no se registra dos veces para la misma sesión.
  unique (workout_session_id, image_sha256),
  unique (id, player_id),
  foreign key (workout_session_id, player_id) references public.workout_sessions (id, player_id) on delete cascade
);
create index watch_uploads_session_idx on public.watch_uploads (workout_session_id);

create table public.watch_metrics (
  id                 uuid primary key default gen_random_uuid(),
  upload_id          uuid not null,
  player_id          uuid not null,
  workout_session_id uuid not null,
  metric_type        public.watch_metric_type not null,
  metric_value       text not null check (char_length(metric_value) <= 100), -- valor original extraído
  metric_unit        text check (char_length(metric_unit) <= 20),
  source             text check (char_length(source) <= 200),
  confidence         numeric(3, 2) check (confidence between 0 and 1),
  validation_status  public.validation_status not null default 'pending',
  confirmed_value    text check (char_length(confirmed_value) <= 100),
  confirmed_by       uuid references auth.users (id) on delete set null,
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now(),
  check (validation_status not in ('confirmed', 'corrected') or confirmed_value is not null),
  foreign key (upload_id, player_id) references public.watch_uploads (id, player_id) on delete cascade,
  foreign key (workout_session_id, player_id) references public.workout_sessions (id, player_id) on delete cascade
);
create index watch_metrics_session_idx on public.watch_metrics (workout_session_id, metric_type);

-- Varias capturas del mismo entrenamiento no duplican estadísticas:
-- a lo sumo un valor validado por sesión y métrica.
create unique index watch_metrics_one_validated_per_session
  on public.watch_metrics (workout_session_id, metric_type)
  where validation_status in ('confirmed', 'corrected');

-- Estadísticas oficiales: solo valores revisados por un adulto.
create view public.confirmed_watch_metrics
with (security_invoker = true) as
select
  m.player_id,
  m.workout_session_id,
  m.metric_type,
  m.confirmed_value as value,
  m.metric_unit as unit,
  m.validation_status,
  m.confirmed_at
from public.watch_metrics m
where m.validation_status in ('confirmed', 'corrected');

-- >>>>> 20261111000600_security.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0600 · Seguridad: privilegios y Row Level Security
-- =============================================================================
-- Regla general (ver docs/ARQUITECTURA.md §7):
--   * Lectura: cualquier usuario vinculado al jugador (papá y el propio jugador).
--   * Registros del día a día (sesiones, partidos, bienestar): los puede crear
--     y editar el jugador; borrar solo papá.
--   * Contenido y configuración (ejercicios, plantillas, evaluaciones,
--     calendario, datos del reloj, perfil del jugador): solo papá.
--   * Logros/XP y vínculos de acceso: solo el servidor (service_role).
--   * Usuarios anónimos: sin acceso a nada.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Privilegios de tabla (RLS filtra filas; esto limita operaciones/columnas)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- profiles: el usuario solo puede cambiar su nombre visible.
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- player_access: solo lectura para la app.
revoke insert, update, delete on public.player_access from authenticated;

-- players: no se crean ni borran desde la app.
revoke insert, delete on public.players from authenticated;

-- achievements / xp_events: los otorga el servidor.
revoke insert, update, delete on public.achievements, public.xp_events from authenticated;

-- La vista hereda el RLS de watch_metrics (security_invoker).
revoke insert, update, delete on public.confirmed_watch_metrics from authenticated;

-- created_by / uploaded_by / proposed_by se completan solos con el usuario actual.
alter table public.exercises         alter column created_by  set default auth.uid();
alter table public.workout_templates alter column created_by  set default auth.uid();
alter table public.workout_sessions  alter column created_by  set default auth.uid();
alter table public.matches           alter column created_by  set default auth.uid();
alter table public.wellness_logs     alter column created_by  set default auth.uid();
alter table public.assessments       alter column created_by  set default auth.uid();
alter table public.watch_uploads     alter column uploaded_by set default auth.uid();
alter table public.goals             alter column proposed_by set default auth.uid();

-- ---------------------------------------------------------------------------
-- Activar RLS en TODAS las tablas del esquema public
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Políticas estándar según la matriz de permisos.
--   'member' = papá o jugador vinculados · 'admin' = solo papá · null = nadie
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  owner_col text;
  using_expr text;
begin
  for r in
    select * from (values
      -- tabla                 select    insert    update    delete
      ('players',              'member', null,     'admin',  null),
      ('exercises',            'member', 'admin',  'admin',  'admin'),
      ('workout_templates',    'member', 'admin',  'admin',  'admin'),
      ('workout_items',        'member', 'admin',  'admin',  'admin'),
      ('workout_sessions',     'member', 'member', 'member', 'admin'),
      ('session_results',      'member', 'member', 'member', 'admin'),
      ('matches',              'member', 'member', 'member', 'admin'),
      ('match_statistics',     'member', 'member', 'member', 'admin'),
      ('match_reflections',    'member', 'member', 'member', 'admin'),
      ('wellness_logs',        'member', 'member', 'member', 'admin'),
      ('assessments',          'member', 'admin',  'admin',  'admin'),
      ('calendar_events',      'member', 'admin',  'admin',  'admin'),
      ('achievements',         'member', null,     null,     null),
      ('xp_events',            'member', null,     null,     null),
      ('watch_uploads',        'member', 'admin',  'admin',  'admin'),
      ('watch_metrics',        'member', 'admin',  'admin',  'admin')
    ) as m(tbl, sel, ins, upd, del)
  loop
    -- En la tabla players la clave es "id"; en el resto, "player_id".
    owner_col := case when r.tbl = 'players' then 'id' else 'player_id' end;

    if r.sel is not null then
      using_expr := format('private.is_%s(%I)', r.sel, owner_col);
      execute format('create policy %I on public.%I for select to authenticated using (%s)',
        r.tbl || '_select', r.tbl, using_expr);
    end if;

    if r.ins is not null then
      using_expr := format('private.is_%s(%I)', r.ins, owner_col);
      execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
        r.tbl || '_insert', r.tbl, using_expr);
    end if;

    if r.upd is not null then
      using_expr := format('private.is_%s(%I)', r.upd, owner_col);
      execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
        r.tbl || '_update', r.tbl, using_expr, using_expr);
    end if;

    if r.del is not null then
      using_expr := format('private.is_%s(%I)', r.del, owner_col);
      execute format('create policy %I on public.%I for delete to authenticated using (%s)',
        r.tbl || '_delete', r.tbl, using_expr);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Políticas especiales
-- ---------------------------------------------------------------------------

-- profiles: el propio perfil y el de quienes comparten jugador (para ver nombres).
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_player(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- player_access: los vínculos propios, o todos los del jugador si sos admin.
create policy player_access_select on public.player_access for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin(player_id));

-- exercise_favorites: cada usuario maneja sus favoritos.
create policy exercise_favorites_select on public.exercise_favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy exercise_favorites_insert on public.exercise_favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_member(player_id));
create policy exercise_favorites_delete on public.exercise_favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- goals: el jugador PROPONE objetivos (sin aprobar); papá administra todo.
create policy goals_select on public.goals for select to authenticated
  using (private.is_member(player_id));
create policy goals_insert on public.goals for insert to authenticated
  with check (
    private.is_admin(player_id)
    or (private.is_member(player_id) and approved = false and proposed_by = (select auth.uid()))
  );
create policy goals_update on public.goals for update to authenticated
  using (
    private.is_admin(player_id)
    or (private.is_member(player_id) and approved = false and proposed_by = (select auth.uid()))
  )
  with check (
    private.is_admin(player_id)
    or (private.is_member(player_id) and approved = false and proposed_by = (select auth.uid()))
  );
create policy goals_delete on public.goals for delete to authenticated
  using (
    private.is_admin(player_id)
    or (private.is_member(player_id) and approved = false and proposed_by = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Integridad: el autor registrado siempre es el usuario actual
-- (impide atribuir registros a otra persona).
-- ---------------------------------------------------------------------------
create or replace function private.enforce_author()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text := tg_argv[0];
begin
  -- service_role (scripts de servidor) no tiene auth.uid(): se respeta el valor dado.
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(col, (select auth.uid())));
  elsif (to_jsonb(new) ->> col) is distinct from (to_jsonb(old) ->> col) then
    raise exception 'No se puede modificar el autor del registro (%).', col
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger exercises_author         before insert or update on public.exercises         for each row execute function private.enforce_author('created_by');
create trigger workout_templates_author before insert or update on public.workout_templates for each row execute function private.enforce_author('created_by');
create trigger workout_sessions_author  before insert or update on public.workout_sessions  for each row execute function private.enforce_author('created_by');
create trigger matches_author           before insert or update on public.matches           for each row execute function private.enforce_author('created_by');
create trigger wellness_logs_author     before insert or update on public.wellness_logs     for each row execute function private.enforce_author('created_by');
create trigger assessments_author       before insert or update on public.assessments       for each row execute function private.enforce_author('created_by');
create trigger watch_uploads_author     before insert or update on public.watch_uploads     for each row execute function private.enforce_author('uploaded_by');
create trigger goals_author             before insert or update on public.goals             for each row execute function private.enforce_author('proposed_by');

-- Confirmación de métricas del reloj: quién y cuándo, siempre del servidor.
create or replace function private.stamp_metric_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.validation_status is distinct from old.validation_status
     or new.confirmed_value is distinct from old.confirmed_value then
    if new.validation_status = 'pending' then
      new.confirmed_by := null;
      new.confirmed_at := null;
    else
      new.confirmed_by := (select auth.uid());
      new.confirmed_at := now();
    end if;
  end if;
  -- El valor original extraído por la IA nunca se reescribe.
  if new.metric_value is distinct from old.metric_value then
    raise exception 'El valor original extraído no se puede modificar.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger watch_metrics_review before update on public.watch_metrics
  for each row execute function private.stamp_metric_review();

-- >>>>> 20261111000700_storage.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0700 · Storage privado
-- =============================================================================
-- Rutas: <player_id>/<...>. Ningún bucket es público; la app accede con URLs
-- firmadas de corta duración.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('watch-screenshots', 'watch-screenshots', false, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic']),
  ('player-media', 'player-media', false, 52428800,
    array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Primer segmento de la ruta como player_id (NULL si no es un UUID válido).
create or replace function private.path_player_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  first_segment text := split_part(p_name, '/', 1);
begin
  if first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;
grant execute on function private.path_player_id(text) to authenticated, service_role;

-- watch-screenshots: papá sube y administra; ambos pueden ver.
create policy watch_screenshots_select on storage.objects for select to authenticated
  using (bucket_id = 'watch-screenshots' and private.is_member(private.path_player_id(name)));
create policy watch_screenshots_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)));
create policy watch_screenshots_update on storage.objects for update to authenticated
  using (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)))
  with check (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)));
create policy watch_screenshots_delete on storage.objects for delete to authenticated
  using (bucket_id = 'watch-screenshots' and private.is_admin(private.path_player_id(name)));

-- player-media (avatar, "mi mejor jugada"): ambos suben; borra papá o quien lo subió.
create policy player_media_select on storage.objects for select to authenticated
  using (bucket_id = 'player-media' and private.is_member(private.path_player_id(name)));
create policy player_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'player-media' and private.is_member(private.path_player_id(name)));
create policy player_media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'player-media'
    and (
      private.is_admin(private.path_player_id(name))
      or (owner_id = (select auth.uid())::text and private.is_member(private.path_player_id(name)))
    )
  );

-- >>>>> 20261111000800_setup_codes.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0800 · Configuración inicial desde la app
-- =============================================================================
-- La primera cuenta (papá) se crea desde la app con un CÓDIGO DE INSTALACIÓN de
-- un solo uso. Así no hace falta abrir el registro público: sin el código
-- nadie puede crear cuentas, y una vez usado deja de servir.
-- Solo la Edge Function "family-accounts" (service_role) accede a esto.
-- =============================================================================

create table public.setup_codes (
  code_hash  text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz
);
alter table public.setup_codes enable row level security;
revoke all on public.setup_codes from anon, authenticated;
comment on table public.setup_codes is 'Códigos de instalación de un solo uso (se guarda solo su hash SHA-256).';

-- Consume un código de forma atómica. true si era válido.
create or replace function public.consume_setup_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.setup_codes
     set used_at = now()
   where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
     and used_at is null
     and expires_at > now();
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

-- Devuelve un código a "sin usar" si la instalación falló a mitad de camino.
create or replace function public.release_setup_code(p_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.setup_codes
     set used_at = null
   where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');
$$;

revoke all on function public.consume_setup_code(text), public.release_setup_code(text) from public, anon, authenticated;
grant execute on function public.consume_setup_code(text), public.release_setup_code(text) to service_role;

-- Genera un código nuevo (lo ejecuta el administrador desde el SQL Editor o Claude).
-- Devuelve el código en texto claro UNA vez; en la base queda solo el hash.
create or replace function private.new_setup_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sin 0/O ni 1/I/L
  code text := '';
  i int;
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  code := substr(code, 1, 4) || '-' || substr(code, 5, 4);
  insert into public.setup_codes (code_hash) values (encode(extensions.digest(code, 'sha256'), 'hex'));
  return code;
end;
$$;
revoke all on function private.new_setup_code() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Registro cerrado: solo se aceptan cuentas creadas por la Edge Function
-- "family-accounts" (que marca app_metadata.fp_invited). Un registro público
-- desde la API es rechazado por la base aunque esté habilitado en Auth.
-- app_metadata solo lo puede escribir el servidor (clave secreta).
-- -----------------------------------------------------------------------------
create or replace function private.reject_uninvited_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'fp_invited', '') <> 'true' then
    raise exception 'Registro cerrado: las cuentas se crean desde la app.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reject_uninvited_signup
  before insert on auth.users
  for each row execute function private.reject_uninvited_signup();

-- >>>>> 20261111000900_account_invites.sql
-- =============================================================================
-- FUTBOLISTA PRO · 0900 · Registro cerrado con invitaciones
-- =============================================================================
-- Reemplaza el control por app_metadata (Supabase Auth guarda los metadatos
-- después de insertar el usuario, así que no sirven para decidir en el INSERT).
--
-- Ahora la Edge Function "family-accounts" anota el email en account_invites
-- justo antes de crear la cuenta. La base solo acepta usuarios cuyo email
-- tenga una invitación vigente (2 minutos) y la consume al usarla.
-- Cualquier registro público desde la API es rechazado.
-- =============================================================================

create table public.account_invites (
  email      text primary key check (email = lower(email)),
  expires_at timestamptz not null default now() + interval '2 minutes'
);
alter table public.account_invites enable row level security;
revoke all on public.account_invites from anon, authenticated;
grant all on public.account_invites to service_role;
comment on table public.account_invites is 'Emails autorizados a crear cuenta (los anota la Edge Function family-accounts; duran 2 minutos).';

create or replace function private.reject_uninvited_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.account_invites
   where email = lower(new.email)
     and expires_at > now();
  if not found then
    raise exception 'Registro cerrado: las cuentas se crean desde la app.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- >>>>> 20261111001000_training_features.sql
-- =============================================================================
-- FUTBOLISTA PRO · 1000 · Fase 3: entrenamiento
-- =============================================================================
-- * save_workout(): guarda un entrenamiento y sus ejercicios en una sola
--   operación (atómica, respeta RLS: solo papá).
-- * finish_session(): registra una sesión realizada con sus resultados.
--   Idempotente por client_id → los reintentos sin conexión no duplican.
-- * Biblioteca inicial: cada jugador nuevo recibe 30 ejercicios base.
--
-- Diseño "solo agregar/actualizar": al editar no se borran filas; las que
-- sobran quedan marcadas con removed = true (y la app las ignora). Así se
-- conserva el historial y ninguna operación es destructiva.
-- =============================================================================

alter table public.workout_items  add column removed boolean not null default false;
alter table public.session_results add column removed boolean not null default false;
comment on column public.workout_items.removed is 'true = quitado del entrenamiento al editarlo (se conserva, la app lo ignora).';
comment on column public.session_results.removed is 'true = reemplazado al reenviar la sesión (se conserva, la app lo ignora).';

-- -----------------------------------------------------------------------------
-- Guardar entrenamiento (plantilla o programado) con sus ejercicios
-- -----------------------------------------------------------------------------
create or replace function public.save_workout(p_workout jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_workout ->> 'id', '')::uuid;
  v_player uuid := (p_workout ->> 'player_id')::uuid;
  v_item jsonb;
  v_ord bigint;
  v_pos smallint;
  v_count int;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El entrenamiento necesita al menos un ejercicio.' using errcode = '23514';
  end if;
  v_count := jsonb_array_length(p_items);

  if v_id is null then
    insert into public.workout_templates (player_id, name, objective, notes, est_minutes, is_template, scheduled_for)
    values (
      v_player,
      p_workout ->> 'name',
      nullif(p_workout ->> 'objective', ''),
      nullif(p_workout ->> 'notes', ''),
      nullif(p_workout ->> 'est_minutes', '')::smallint,
      coalesce((p_workout ->> 'is_template')::boolean, true),
      nullif(p_workout ->> 'scheduled_for', '')::date
    )
    returning id into v_id;
  else
    update public.workout_templates set
      name = p_workout ->> 'name',
      objective = nullif(p_workout ->> 'objective', ''),
      notes = nullif(p_workout ->> 'notes', ''),
      est_minutes = nullif(p_workout ->> 'est_minutes', '')::smallint,
      is_template = coalesce((p_workout ->> 'is_template')::boolean, true),
      scheduled_for = nullif(p_workout ->> 'scheduled_for', '')::date
    where id = v_id and player_id = v_player;
    if not found then
      raise exception 'Entrenamiento no encontrado o sin permiso.' using errcode = '42501';
    end if;
  end if;

  -- Cada posición se actualiza si ya existía o se agrega si es nueva.
  for v_item, v_ord in
    select t.item, t.ord from jsonb_array_elements(p_items) with ordinality as t(item, ord)
  loop
    v_pos := (v_ord - 1)::smallint;
    update public.workout_items set
      exercise_id = (v_item ->> 'exercise_id')::uuid,
      sets = nullif(v_item ->> 'sets', '')::smallint,
      reps = nullif(v_item ->> 'reps', '')::smallint,
      duration_sec = nullif(v_item ->> 'duration_sec', '')::integer,
      rest_sec = nullif(v_item ->> 'rest_sec', '')::integer,
      instructions = nullif(v_item ->> 'instructions', ''),
      removed = false
    where template_id = v_id and position = v_pos;
    if not found then
      insert into public.workout_items (template_id, player_id, exercise_id, position, sets, reps, duration_sec, rest_sec, instructions)
      values (
        v_id, v_player, (v_item ->> 'exercise_id')::uuid, v_pos,
        nullif(v_item ->> 'sets', '')::smallint,
        nullif(v_item ->> 'reps', '')::smallint,
        nullif(v_item ->> 'duration_sec', '')::integer,
        nullif(v_item ->> 'rest_sec', '')::integer,
        nullif(v_item ->> 'instructions', '')
      );
    end if;
  end loop;

  -- Las posiciones que sobran (se quitaron ejercicios) quedan marcadas.
  update public.workout_items set removed = true
  where template_id = v_id and position >= v_count and not removed;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrar una sesión realizada (idempotente por client_id)
-- -----------------------------------------------------------------------------
create or replace function public.finish_session(p_session jsonb, p_results jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_player uuid := (p_session ->> 'player_id')::uuid;
begin
  insert into public.workout_sessions as s
    (player_id, template_id, title, started_at, ended_at, status, actual_minutes, rpe, notes, post_state, client_id)
  values (
    v_player,
    nullif(p_session ->> 'template_id', '')::uuid,
    p_session ->> 'title',
    (p_session ->> 'started_at')::timestamptz,
    nullif(p_session ->> 'ended_at', '')::timestamptz,
    coalesce(nullif(p_session ->> 'status', ''), 'completed')::public.session_status,
    nullif(p_session ->> 'actual_minutes', '')::smallint,
    nullif(p_session ->> 'rpe', '')::smallint,
    nullif(p_session ->> 'notes', ''),
    nullif(p_session ->> 'post_state', '')::smallint,
    (p_session ->> 'client_id')::uuid
  )
  on conflict (client_id) do update set
    title = excluded.title,
    ended_at = excluded.ended_at,
    status = excluded.status,
    actual_minutes = excluded.actual_minutes,
    rpe = excluded.rpe,
    notes = excluded.notes,
    post_state = excluded.post_state
  where s.player_id = excluded.player_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Sesión no encontrada o sin permiso.' using errcode = '42501';
  end if;

  -- Un reenvío reemplaza los resultados anteriores (quedan marcados).
  update public.session_results set removed = true where session_id = v_id and not removed;

  if jsonb_typeof(p_results) = 'array' then
    insert into public.session_results (session_id, player_id, workout_item_id, exercise_id, completed, sets_done, reps_done, notes)
    select
      v_id,
      v_player,
      nullif(r ->> 'workout_item_id', '')::uuid,
      nullif(r ->> 'exercise_id', '')::uuid,
      coalesce((r ->> 'completed')::boolean, false),
      nullif(r ->> 'sets_done', '')::smallint,
      nullif(r ->> 'reps_done', '')::smallint,
      nullif(r ->> 'notes', '')
    from jsonb_array_elements(p_results) as t(r);
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_workout(jsonb, jsonb), public.finish_session(jsonb, jsonb) from public, anon;
grant execute on function public.save_workout(jsonb, jsonb), public.finish_session(jsonb, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Biblioteca inicial de ejercicios (adaptada a 9–13 años)
-- -----------------------------------------------------------------------------
create or replace function private.seed_default_exercises(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.exercises where player_id = p_player_id and is_custom = false) then
    return; -- ya cargada
  end if;

  insert into public.exercises
    (player_id, is_custom, category, name, objective, description, difficulty, est_minutes, materials, steps, common_mistakes, precautions, result_indicator)
  values
  -- Velocidad y explosividad --------------------------------------------------
  (p_player_id, false, 'speed', 'Aceleraciones 5-10-15 m', 'Mejorar la salida y los primeros pasos.',
   'Sprints cortos desde parado a tres distancias, con recuperación completa.', 1, 8,
   '{Conos}', '{"Marcá con conos 5, 10 y 15 metros.","Salí en posición de semiflexión, un pie adelante.","Corré a máxima velocidad hasta el cono indicado.","Volvé caminando y descansá 45 segundos."}',
   '{"Salir erguido","Pasos largos al inicio en vez de cortos y rápidos"}',
   'Hacelo después de entrar en calor. Pará si sentís dolor.', 'Mejor tiempo en 10 m (segundos)'),
  (p_player_id, false, 'speed', 'Frenadas y arranques', 'Controlar el cuerpo al cambiar de ritmo.',
   'Correr, frenar en dos tiempos y volver a arrancar.', 2, 8,
   '{Conos}', '{"Corré 8 metros a buena velocidad.","Frená con pasos cortos bajando la cadera.","Quedate quieto un segundo y volvé a arrancar."}',
   '{"Frenar con las piernas rectas","Inclinarse hacia atrás"}',
   'Superficie firme y antideslizante.', 'Frenadas controladas sin perder el equilibrio'),
  (p_player_id, false, 'speed', 'Reacción a la señal', 'Reaccionar rápido ante un estímulo.',
   'Salir corriendo cuando un adulto da una señal visual o sonora.', 1, 6,
   '{Conos}', '{"Ubicate en posición de salida.","Un adulto aplaude o levanta un color.","Salí lo más rápido posible 5 metros."}',
   '{"Adelantarse a la señal","Mirar al piso"}',
   'Descansá entre repeticiones.', 'Salidas a tiempo de 10 intentos'),
  (p_player_id, false, 'speed', 'Cambios de dirección en zigzag', 'Ganar agilidad para eludir rivales.',
   'Recorrido entre conos en zigzag a buena velocidad.', 2, 8,
   '{Conos}', '{"Poné 6 conos en zigzag separados 3 metros.","Recorrelos tocando cada cono con la mano.","Bajá la cadera en cada cambio."}',
   '{"Abrir mucho las curvas","Cruzar los pies"}',
   'Zapatillas o botines con buen agarre.', 'Tiempo del recorrido (segundos)'),
  (p_player_id, false, 'speed', 'Desplazamientos laterales', 'Mejorar la defensa y los cierres.',
   'Pasos laterales rápidos entre dos conos sin cruzar los pies.', 1, 6,
   '{Conos}', '{"Dos conos a 4 metros.","Desplazate de costado de cono a cono.","Mirá siempre al frente."}',
   '{"Cruzar los pies","Quedar con las piernas rectas"}',
   NULL, 'Toques de cono en 20 segundos'),
  -- Técnica individual --------------------------------------------------------
  (p_player_id, false, 'technique', 'Dominio de pelota', 'Mejorar el control y la sensibilidad con la pelota.',
   'Toques sin que la pelota caiga, alternando piernas.', 1, 8,
   '{Pelota}', '{"Soltá la pelota y tocala con el empeine.","Alterná pierna derecha e izquierda.","Contá tu mejor serie."}',
   '{"Patear muy fuerte","Usar siempre la misma pierna"}',
   NULL, 'Mejor serie de toques sin que caiga'),
  (p_player_id, false, 'technique', 'Conducción entre conos', 'Llevar la pelota cerca y con la cabeza levantada.',
   'Conducir en slalom usando interior y exterior de ambos pies.', 1, 8,
   '{Pelota,Conos}', '{"Poné 6 conos separados 1,5 metros.","Conducí en slalom con toques cortos.","Volvé usando la otra pierna."}',
   '{"Pelota muy lejos del pie","Mirar siempre la pelota"}',
   NULL, 'Tiempo ida y vuelta sin tocar conos'),
  (p_player_id, false, 'technique', 'Pase y control contra la pared', 'Precisión en el pase corto y buen primer toque.',
   'Pases con el interior contra una pared y control orientado.', 1, 10,
   '{Pelota,Pared}', '{"Parate a 3–4 metros de la pared.","Pasá con el interior del pie.","Controlá orientando hacia un costado y repetí.","Hacé series con cada pierna."}',
   '{"Pasar con la punta","Controlar con la pelota pegada al cuerpo"}',
   NULL, 'Pases seguidos sin error'),
  (p_player_id, false, 'technique', 'Control orientado', 'Recibir preparándose para la siguiente acción.',
   'Recibir un pase y con el primer toque llevar la pelota hacia un espacio libre.', 2, 10,
   '{Pelota,Conos}', '{"Un compañero o la pared te pasa la pelota.","Antes de recibir, mirá a dónde vas.","Con el primer toque llevá la pelota hacia el cono indicado."}',
   '{"Frenar la pelota en seco","No mirar antes de recibir"}',
   NULL, 'Controles orientados correctos de 10'),
  (p_player_id, false, 'technique', 'Pierna menos hábil', 'Ganar confianza con la pierna no dominante.',
   'Pases, conducción y remates usando solo la pierna menos hábil.', 2, 10,
   '{Pelota,Pared}', '{"Hacé 20 pases contra la pared solo con la pierna menos hábil.","Conducí 10 metros solo con esa pierna.","Terminá con 5 remates suaves."}',
   '{"Volver a la pierna hábil por costumbre","Pegarle sin apoyar bien el otro pie"}',
   NULL, 'Pases correctos con la pierna menos hábil'),
  -- Fuerza y estabilidad ------------------------------------------------------
  (p_player_id, false, 'strength', 'Sentadillas', 'Fortalecer piernas con el peso del cuerpo.',
   'Sentadillas lentas y controladas.', 1, 5,
   '{}', '{"Pies al ancho de hombros.","Bajá como si te sentaras en una silla.","Rodillas en línea con los pies.","Subí despacio."}',
   '{"Rodillas hacia adentro","Levantar los talones"}',
   'Sin peso extra. Calidad antes que cantidad.', 'Repeticiones bien hechas'),
  (p_player_id, false, 'strength', 'Plancha', 'Fortalecer el tronco (zona media).',
   'Sostener el cuerpo recto apoyado en antebrazos y puntas de pie.', 1, 4,
   '{Colchoneta}', '{"Apoyá antebrazos y puntas de pie.","Cuerpo recto de la cabeza a los talones.","Respirá normal y sostené."}',
   '{"Cadera muy alta o muy baja","Contener la respiración"}',
   'Pará si te duele la espalda.', 'Segundos sostenidos con buena postura'),
  (p_player_id, false, 'strength', 'Zancadas', 'Fuerza y equilibrio de piernas.',
   'Paso largo hacia adelante bajando la rodilla de atrás.', 1, 5,
   '{}', '{"Dá un paso largo hacia adelante.","Bajá hasta que ambas rodillas formen un ángulo recto.","Volvé y cambiá de pierna."}',
   '{"Rodilla de adelante pasando la punta del pie","Tronco inclinado"}',
   NULL, 'Repeticiones por pierna'),
  (p_player_id, false, 'strength', 'Flexiones adaptadas', 'Fuerza de brazos y tronco.',
   'Flexiones con rodillas apoyadas o en un banco.', 1, 4,
   '{}', '{"Manos al ancho de hombros.","Rodillas apoyadas si hace falta.","Bajá el pecho controlado y subí."}',
   '{"Cadera hundida","Codos muy abiertos"}',
   NULL, 'Repeticiones bien hechas'),
  (p_player_id, false, 'strength', 'Equilibrio en un pie', 'Estabilidad de tobillo y rodilla.',
   'Sostenerse en un pie con pequeños desafíos.', 1, 5,
   '{}', '{"Parate en un pie con la rodilla apenas flexionada.","Sostené 30 segundos.","Probá con ojos cerrados o pasando una pelota."}',
   '{"Rodilla trabada","Mirar al piso"}',
   'Cerca de una pared por seguridad.', 'Segundos sin apoyar el otro pie'),
  -- Resistencia ---------------------------------------------------------------
  (p_player_id, false, 'endurance', 'Carrera continua suave', 'Mejorar la resistencia aeróbica.',
   'Trotar a ritmo cómodo, pudiendo hablar mientras corrés.', 1, 12,
   '{}', '{"Trotá a un ritmo en el que puedas conversar.","Mantené el ritmo el tiempo indicado.","Terminá caminando 2 minutos."}',
   '{"Empezar muy rápido","Parar de golpe"}',
   'Hidratate antes y después.', 'Minutos trotando sin parar'),
  (p_player_id, false, 'endurance', 'Intervalos 30/30', 'Resistencia a esfuerzos repetidos como en el partido.',
   '30 segundos rápido y 30 segundos trotando suave.', 2, 10,
   '{Conos}', '{"Corré 30 segundos a ritmo alto (no máximo).","Trotá suave 30 segundos.","Repetí las series indicadas."}',
   '{"Ir al máximo y no poder terminar","Parar en la recuperación"}',
   'Si te mareás, pará y avisá a un adulto.', 'Series completas'),
  (p_player_id, false, 'endurance', 'Circuito con pelota', 'Resistencia jugando con la pelota.',
   'Recorrido que combina conducción, pase y carrera.', 2, 10,
   '{Pelota,Conos,Pared}', '{"Conducí 15 metros.","Pasá contra la pared 5 veces.","Volvé corriendo al inicio.","Repetí sin parar el tiempo indicado."}',
   '{"Bajar la calidad técnica por el cansancio"}',
   NULL, 'Vueltas completas'),
  (p_player_id, false, 'endurance', 'Juego de persecución', 'Resistencia de forma divertida.',
   'Juego de "mancha" con compañeros o familia en un espacio delimitado.', 1, 10,
   '{Conos}', '{"Marcá un espacio con conos.","Uno persigue y los demás escapan.","Cambien de rol cada minuto."}',
   '{"Salirse del espacio"}',
   'Espacio sin obstáculos.', 'Minutos jugando'),
  (p_player_id, false, 'endurance', 'Recuperación activa', 'Aprender a recuperarse entre esfuerzos.',
   'Caminata y trote muy suave con respiración controlada.', 1, 5,
   '{}', '{"Caminá 1 minuto respirando profundo.","Trotá muy suave 1 minuto.","Repetí."}',
   '{"Quedarse quieto de golpe"}',
   NULL, 'Sensación de recuperación (1 a 5)'),
  -- Coordinación y agilidad ---------------------------------------------------
  (p_player_id, false, 'coordination', 'Escalera de coordinación', 'Pies rápidos y coordinados.',
   'Distintos patrones de pasos en una escalera en el piso.', 1, 8,
   '{"Escalera o tiza"}', '{"Un pie en cada casillero.","Dos pies en cada casillero.","Desplazamiento lateral.","Entrar y salir (adentro-adentro-afuera-afuera)."}',
   '{"Mirar los pies todo el tiempo","Pisar los travesaños"}',
   NULL, 'Recorridos sin errores'),
  (p_player_id, false, 'coordination', 'Saltos coordinados', 'Coordinación y potencia de piernas.',
   'Saltos a uno y dos pies sobre líneas o conos bajos.', 2, 6,
   '{Conos}', '{"Saltá con dos pies hacia adelante y atrás.","Saltos laterales sobre una línea.","Saltos en un pie (pocas repeticiones)."}',
   '{"Caer con las piernas rectas","Hacer ruido fuerte al caer"}',
   'Caé suave, flexionando rodillas.', 'Saltos correctos por serie'),
  (p_player_id, false, 'coordination', 'Coordinación óculo-pédica', 'Coordinar lo que ves con lo que hacés con los pies.',
   'Tocar con la suela pelotas o conos que un adulto señala.', 1, 6,
   '{Pelota,Conos}', '{"Ubicá 4 conos de colores alrededor tuyo.","Un adulto dice un color.","Tocalo con el pie que corresponda y volvé al centro."}',
   '{"Adelantarse","Usar siempre el mismo pie"}',
   NULL, 'Aciertos de 10'),
  (p_player_id, false, 'coordination', 'Cambios de ritmo', 'Variar la velocidad con control.',
   'Conducción alternando lento y rápido a una señal.', 2, 6,
   '{Pelota}', '{"Conducí despacio.","A la señal, acelerá 5 metros.","Volvé a bajar el ritmo sin perder la pelota."}',
   '{"Perder la pelota al acelerar"}',
   NULL, 'Cambios sin perder la pelota'),
  (p_player_id, false, 'coordination', 'Reacción visual y auditiva', 'Reaccionar rápido a distintas señales.',
   'Moverse según la señal: un color o un sonido indican la dirección.', 1, 6,
   '{Conos}', '{"Rojo = izquierda, azul = derecha.","Un aplauso = salto.","Respondé lo más rápido posible."}',
   '{"Anticiparse sin la señal"}',
   NULL, 'Respuestas correctas de 10'),
  -- Inteligencia táctica ------------------------------------------------------
  (p_player_id, false, 'tactics', 'Escaneo antes de recibir', 'Mirar alrededor antes de que llegue la pelota.',
   'Antes de cada pase, girar la cabeza a ambos lados y decir qué ves.', 2, 8,
   '{Pelota,Pared}', '{"Pasá contra la pared.","Mientras vuelve la pelota, mirá a izquierda y derecha.","Un adulto muestra dedos: decí cuántos antes de controlar."}',
   '{"Mirar solo la pelota","Girar tarde la cabeza"}',
   NULL, 'Escaneos correctos de 10'),
  (p_player_id, false, 'tactics', 'Perfil corporal', 'Recibir con el cuerpo abierto hacia el juego.',
   'Recibir de costado, con el pie de atrás, mirando el arco o el campo.', 2, 8,
   '{Pelota,Conos}', '{"Ubicate de costado al pase.","Recibí con el pie más lejano.","Salí jugando hacia adelante."}',
   '{"Recibir de frente y quedar de espaldas al juego"}',
   NULL, 'Recepciones con buen perfil de 10'),
  (p_player_id, false, 'tactics', 'Toma de decisiones 2 opciones', 'Elegir rápido la mejor opción.',
   'Al recibir, un adulto indica un cono: pasar o conducir según el lado libre.', 2, 8,
   '{Pelota,Conos}', '{"Dos conos de salida a los costados.","Al recibir, el adulto tapa uno.","Elegí y jugá por el libre."}',
   '{"Decidir tarde","Ir siempre al mismo lado"}',
   NULL, 'Decisiones correctas de 10'),
  (p_player_id, false, 'tactics', 'Desmarque y ofrecimiento', 'Moverse para recibir libre de marca.',
   'Moverse a un espacio libre para ofrecer una línea de pase.', 2, 8,
   '{Pelota,Conos}', '{"Un adulto con la pelota y un cono como defensor.","Movete para que el cono no tape la línea de pase.","Pedí la pelota con la mano y la voz."}',
   '{"Quedarse quieto detrás del defensor"}',
   NULL, 'Veces que quedaste libre para recibir'),
  (p_player_id, false, 'tactics', 'Ocupación de espacios del mediocampista', 'Entender dónde ubicarse en el campo.',
   'Ejercicio con conos que representan compañeros y rivales para elegir la mejor ubicación.', 2, 10,
   '{Conos}', '{"Armá con conos una situación de juego.","Ubicate entre líneas, donde puedas recibir.","Explicá por qué elegiste ese lugar."}',
   '{"Ubicarse en la misma línea que un compañero"}',
   NULL, 'Ubicaciones correctas');
end;
$$;
revoke all on function private.seed_default_exercises(uuid) from public, anon, authenticated;

create or replace function private.seed_exercises_for_new_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_default_exercises(new.id);
  return new;
end;
$$;

create trigger players_seed_exercises
  after insert on public.players
  for each row execute function private.seed_exercises_for_new_player();

-- Jugadores que ya existían.
select private.seed_default_exercises(id) from public.players;

-- >>>>> 20261111001100_phase4_matches_wellness_goals.sql
-- =============================================================================
-- FUTBOLISTA PRO · 1100 · Fase 4: partidos, bienestar, objetivos y evaluaciones
-- =============================================================================
-- * save_match(): guarda un partido con sus estadísticas y su evaluación
--   personal en una sola operación. Idempotente por client_id (cola sin conexión).
-- * save_wellness(): un registro de bienestar por día; guardar de nuevo el mismo
--   día lo actualiza. El semáforo lo calcula la base (no se puede falsear).
-- * Diseño "solo agregar/actualizar": partidos, objetivos y evaluaciones se
--   "quitan" marcándolos con removed = true; la app los ignora y se conserva
--   el historial. Ninguna operación de esta fase borra filas.
-- =============================================================================

alter table public.matches     add column removed boolean not null default false;
alter table public.goals       add column removed boolean not null default false;
alter table public.assessments add column removed boolean not null default false;
comment on column public.matches.removed     is 'true = quitado por el usuario (se conserva, la app lo ignora).';
comment on column public.goals.removed       is 'true = quitado por el usuario (se conserva, la app lo ignora).';
comment on column public.assessments.removed is 'true = quitado por papá (se conserva, la app lo ignora).';

create index matches_player_active_idx on public.matches (player_id, played_on desc) where not removed;

-- Bienestar: dolor y enfermedad (alimentan el semáforo).
alter table public.wellness_logs
  add column pain_level smallint not null default 0 check (pain_level between 0 and 3),
  add column sick       boolean  not null default false;
comment on column public.wellness_logs.pain_level is '0 = sin dolor · 1 = leve · 2 = moderado · 3 = fuerte.';
comment on column public.wellness_logs.soreness   is '1 = nada de cansancio muscular · 5 = muchísimo (a más número, peor).';

-- -----------------------------------------------------------------------------
-- Semáforo de bienestar
--   rojo:     enfermo, dolor moderado o fuerte, o "estado general" mínimo.
--   amarillo: dolor leve, molestia anotada, duerme poco o mal, poca energía,
--             mucho cansancio muscular, pocas ganas, estado bajo o poca agua.
--   verde:    el resto. Los datos no registrados no se asumen: se ignoran.
--   Sin ningún dato → sin semáforo (null).
-- Debe coincidir con src/features/wellness/traffic.ts (hay pruebas en ambos).
-- -----------------------------------------------------------------------------
create or replace function private.wellness_light(w public.wellness_logs)
returns public.traffic_light
language sql
immutable
set search_path = ''
as $$
  select case
    when w.sick or w.pain_level >= 2 or w.overall = 1 then 'red'::public.traffic_light
    when w.pain_level = 1
      or nullif(btrim(coalesce(w.discomfort, '')), '') is not null
      or w.sleep_hours < 8
      or w.sleep_quality <= 2
      or w.energy <= 2
      or w.soreness >= 4
      or w.motivation <= 2
      or w.overall <= 2
      or w.hydration <= 2 then 'yellow'::public.traffic_light
    when w.sleep_hours is null and w.sleep_quality is null and w.energy is null
      and w.soreness is null and w.motivation is null and w.overall is null
      and w.hydration is null then null
    else 'green'::public.traffic_light
  end;
$$;

create or replace function private.set_wellness_light()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.traffic_light := private.wellness_light(new);
  return new;
end;
$$;

create trigger wellness_logs_light before insert or update on public.wellness_logs
  for each row execute function private.set_wellness_light();

-- -----------------------------------------------------------------------------
-- Guardar un partido (idempotente por client_id)
-- -----------------------------------------------------------------------------
create or replace function public.save_match(p_match jsonb, p_stats jsonb, p_reflection jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_player uuid := (p_match ->> 'player_id')::uuid;
begin
  insert into public.matches as m
    (player_id, played_on, opponent, competition, goals_for, goals_against, position, minutes, starter, notes, client_id)
  values (
    v_player,
    (p_match ->> 'played_on')::date,
    p_match ->> 'opponent',
    nullif(p_match ->> 'competition', ''),
    nullif(p_match ->> 'goals_for', '')::smallint,
    nullif(p_match ->> 'goals_against', '')::smallint,
    nullif(p_match ->> 'position', ''),
    nullif(p_match ->> 'minutes', '')::smallint,
    nullif(p_match ->> 'starter', '')::boolean,
    nullif(p_match ->> 'notes', ''),
    (p_match ->> 'client_id')::uuid
  )
  on conflict (client_id) do update set
    played_on = excluded.played_on,
    opponent = excluded.opponent,
    competition = excluded.competition,
    goals_for = excluded.goals_for,
    goals_against = excluded.goals_against,
    position = excluded.position,
    minutes = excluded.minutes,
    starter = excluded.starter,
    notes = excluded.notes
  where m.player_id = excluded.player_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Partido no encontrado o sin permiso.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_stats) = 'object' then
    insert into public.match_statistics as s
      (match_id, player_id, goals, assists, passes_ok, passes_failed, recoveries, interceptions,
       shots, shots_on_target, duels_won, losses, fouls)
    values (
      v_id, v_player,
      nullif(p_stats ->> 'goals', '')::smallint,
      nullif(p_stats ->> 'assists', '')::smallint,
      nullif(p_stats ->> 'passes_ok', '')::smallint,
      nullif(p_stats ->> 'passes_failed', '')::smallint,
      nullif(p_stats ->> 'recoveries', '')::smallint,
      nullif(p_stats ->> 'interceptions', '')::smallint,
      nullif(p_stats ->> 'shots', '')::smallint,
      nullif(p_stats ->> 'shots_on_target', '')::smallint,
      nullif(p_stats ->> 'duels_won', '')::smallint,
      nullif(p_stats ->> 'losses', '')::smallint,
      nullif(p_stats ->> 'fouls', '')::smallint
    )
    on conflict (match_id) do update set
      goals = excluded.goals, assists = excluded.assists,
      passes_ok = excluded.passes_ok, passes_failed = excluded.passes_failed,
      recoveries = excluded.recoveries, interceptions = excluded.interceptions,
      shots = excluded.shots, shots_on_target = excluded.shots_on_target,
      duels_won = excluded.duels_won, losses = excluded.losses, fouls = excluded.fouls;
  end if;

  if jsonb_typeof(p_reflection) = 'object' then
    insert into public.match_reflections
      (match_id, player_id, physical, focus, decisions, offered_support, helped_recover, rating,
       did_well, to_improve, best_play_what, best_play_decision, best_play_good, best_play_different)
    values (
      v_id, v_player,
      nullif(p_reflection ->> 'physical', '')::smallint,
      nullif(p_reflection ->> 'focus', '')::smallint,
      nullif(p_reflection ->> 'decisions', '')::smallint,
      nullif(p_reflection ->> 'offered_support', '')::smallint,
      nullif(p_reflection ->> 'helped_recover', '')::smallint,
      nullif(p_reflection ->> 'rating', '')::smallint,
      nullif(p_reflection ->> 'did_well', ''),
      nullif(p_reflection ->> 'to_improve', ''),
      nullif(p_reflection ->> 'best_play_what', ''),
      nullif(p_reflection ->> 'best_play_decision', ''),
      nullif(p_reflection ->> 'best_play_good', ''),
      nullif(p_reflection ->> 'best_play_different', '')
    )
    on conflict (match_id) do update set
      physical = excluded.physical, focus = excluded.focus, decisions = excluded.decisions,
      offered_support = excluded.offered_support, helped_recover = excluded.helped_recover,
      rating = excluded.rating, did_well = excluded.did_well, to_improve = excluded.to_improve,
      best_play_what = excluded.best_play_what, best_play_decision = excluded.best_play_decision,
      best_play_good = excluded.best_play_good, best_play_different = excluded.best_play_different;
  end if;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Guardar el bienestar del día (uno por jugador y día; repetir lo actualiza)
-- -----------------------------------------------------------------------------
create or replace function public.save_wellness(p_log jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.wellness_logs as w
    (player_id, log_date, sleep_hours, sleep_quality, energy, soreness, discomfort, motivation,
     overall, hydration, pain_level, sick, notes, client_id)
  values (
    (p_log ->> 'player_id')::uuid,
    (p_log ->> 'log_date')::date,
    nullif(p_log ->> 'sleep_hours', '')::numeric,
    nullif(p_log ->> 'sleep_quality', '')::smallint,
    nullif(p_log ->> 'energy', '')::smallint,
    nullif(p_log ->> 'soreness', '')::smallint,
    nullif(p_log ->> 'discomfort', ''),
    nullif(p_log ->> 'motivation', '')::smallint,
    nullif(p_log ->> 'overall', '')::smallint,
    nullif(p_log ->> 'hydration', '')::smallint,
    coalesce(nullif(p_log ->> 'pain_level', '')::smallint, 0),
    coalesce(nullif(p_log ->> 'sick', '')::boolean, false),
    nullif(p_log ->> 'notes', ''),
    (p_log ->> 'client_id')::uuid
  )
  on conflict (player_id, log_date) do update set
    sleep_hours = excluded.sleep_hours,
    sleep_quality = excluded.sleep_quality,
    energy = excluded.energy,
    soreness = excluded.soreness,
    discomfort = excluded.discomfort,
    motivation = excluded.motivation,
    overall = excluded.overall,
    hydration = excluded.hydration,
    pain_level = excluded.pain_level,
    sick = excluded.sick,
    notes = excluded.notes
  returning id into v_id;

  if v_id is null then
    raise exception 'Registro de bienestar no encontrado o sin permiso.' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_match(jsonb, jsonb, jsonb), public.save_wellness(jsonb) from public, anon;
grant execute on function public.save_match(jsonb, jsonb, jsonb), public.save_wellness(jsonb) to authenticated, service_role;

-- >>>>> 20261111001200_phase5_watch_review.sql
-- =============================================================================
-- FUTBOLISTA PRO · 1200 · Fase 5: revisión de métricas del reloj
-- =============================================================================
-- * review_watch_metric(): papá confirma, corrige o descarta un dato extraído.
--   Al confirmar, un valor validado anterior de la misma sesión y métrica pasa a
--   "descartado" (nunca se borra) para que haya un solo valor oficial.
-- * add_watch_metric(): carga manual de un dato (sin captura), ya confirmado.
-- =============================================================================

alter table public.watch_metrics alter column upload_id drop not null;
comment on column public.watch_metrics.upload_id is 'null = dato cargado a mano (sin captura).';

create or replace function public.review_watch_metric(p_id uuid, p_action text, p_value text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m public.watch_metrics;
  v_value text;
begin
  if p_action not in ('confirm', 'correct', 'reject') then
    raise exception 'Acción inválida.' using errcode = '22023';
  end if;
  select * into m from public.watch_metrics where id = p_id;
  if not found then
    raise exception 'Dato no encontrado o sin permiso.' using errcode = '42501';
  end if;

  if p_action = 'reject' then
    update public.watch_metrics set validation_status = 'rejected', confirmed_value = null,
      confirmed_by = (select auth.uid()), confirmed_at = now() where id = p_id;
    if not found then raise exception 'Sin permiso.' using errcode = '42501'; end if;
    return;
  end if;

  v_value := case when p_action = 'confirm' then m.metric_value else btrim(coalesce(p_value, '')) end;
  if v_value = '' or char_length(v_value) > 100 then
    raise exception 'Valor inválido.' using errcode = '23514';
  end if;

  update public.watch_metrics set validation_status = 'rejected', confirmed_value = null
  where workout_session_id = m.workout_session_id and metric_type = m.metric_type
    and id <> p_id and validation_status in ('confirmed', 'corrected');

  update public.watch_metrics set
    validation_status = case when p_action = 'confirm' then 'confirmed' else 'corrected' end::public.validation_status,
    confirmed_value = v_value, confirmed_by = (select auth.uid()), confirmed_at = now()
  where id = p_id;
  if not found then raise exception 'Sin permiso.' using errcode = '42501'; end if;
end;
$$;

create or replace function public.add_watch_metric(
  p_player uuid, p_session uuid, p_type public.watch_metric_type, p_value text, p_unit text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_value text := btrim(coalesce(p_value, ''));
begin
  if v_value = '' or char_length(v_value) > 100 then
    raise exception 'Valor inválido.' using errcode = '23514';
  end if;
  update public.watch_metrics set validation_status = 'rejected', confirmed_value = null
  where workout_session_id = p_session and player_id = p_player and metric_type = p_type
    and validation_status in ('confirmed', 'corrected');
  insert into public.watch_metrics
    (upload_id, player_id, workout_session_id, metric_type, metric_value, metric_unit, source,
     confidence, validation_status, confirmed_value, confirmed_by, confirmed_at)
  values (null, p_player, p_session, p_type, v_value, nullif(btrim(coalesce(p_unit, '')), ''), 'Manual',
     1, 'confirmed', v_value, (select auth.uid()), now())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.review_watch_metric(uuid, text, text), public.add_watch_metric(uuid, uuid, public.watch_metric_type, text, text) from public, anon;
grant execute on function public.review_watch_metric(uuid, text, text), public.add_watch_metric(uuid, uuid, public.watch_metric_type, text, text) to authenticated, service_role;

commit;

select 'Listo: base de datos de Futbolista Pro creada.' as resultado;
