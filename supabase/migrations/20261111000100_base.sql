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
