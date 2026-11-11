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
