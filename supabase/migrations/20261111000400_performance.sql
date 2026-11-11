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
