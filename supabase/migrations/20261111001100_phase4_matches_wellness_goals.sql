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
