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

commit;

select 'Listo: base de datos de Futbolista Pro creada.' as resultado;
