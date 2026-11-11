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
