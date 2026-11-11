-- =============================================================================
-- FUTBOLISTA PRO · 1300 · Datos del reloj cargados a mano en cada entrenamiento
-- =============================================================================
-- Reemplaza la lectura de capturas con IA: al terminar un entrenamiento se pueden
-- cargar los datos que muestra el reloj. Todo es opcional (null = no registrado).
-- Las tablas watch_uploads / watch_metrics quedan sin uso (no se borra nada).
-- =============================================================================

alter table public.workout_sessions
  add column hr_avg           smallint     check (hr_avg between 30 and 250),
  add column hr_max           smallint     check (hr_max between 30 and 250),
  add column calories         integer      check (calories between 0 and 10000),
  add column training_load    integer      check (training_load between 0 and 3000),
  add column aerobic_effect   numeric(2,1) check (aerobic_effect between 1 and 5),
  add column anaerobic_effect numeric(2,1) check (anaerobic_effect between 1 and 5),
  add column zone_vo2max_pct    numeric(4,1) check (zone_vo2max_pct between 0 and 100),
  add column zone_intensive_pct numeric(4,1) check (zone_intensive_pct between 0 and 100),
  add constraint workout_sessions_hr_order check (hr_avg is null or hr_max is null or hr_avg <= hr_max),
  add constraint workout_sessions_zones_total check (coalesce(zone_vo2max_pct, 0) + coalesce(zone_intensive_pct, 0) <= 100);

comment on column public.workout_sessions.hr_avg is 'Ritmo cardíaco promedio (lpm), del reloj.';
comment on column public.workout_sessions.training_load is 'Carga de entrenamiento según el reloj.';
comment on column public.workout_sessions.aerobic_effect is 'Efecto de entrenamiento aeróbico, 1.0 a 5.0.';
comment on column public.workout_sessions.zone_vo2max_pct is 'Porcentaje del tiempo en la zona VO2 máx.';

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
    (player_id, template_id, title, started_at, ended_at, status, actual_minutes, rpe, notes, post_state, client_id,
     hr_avg, hr_max, calories, training_load, aerobic_effect, anaerobic_effect, zone_vo2max_pct, zone_intensive_pct)
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
    (p_session ->> 'client_id')::uuid,
    nullif(p_session ->> 'hr_avg', '')::smallint,
    nullif(p_session ->> 'hr_max', '')::smallint,
    nullif(p_session ->> 'calories', '')::integer,
    nullif(p_session ->> 'training_load', '')::integer,
    nullif(p_session ->> 'aerobic_effect', '')::numeric,
    nullif(p_session ->> 'anaerobic_effect', '')::numeric,
    nullif(p_session ->> 'zone_vo2max_pct', '')::numeric,
    nullif(p_session ->> 'zone_intensive_pct', '')::numeric
  )
  on conflict (client_id) do update set
    title = excluded.title,
    ended_at = excluded.ended_at,
    status = excluded.status,
    actual_minutes = excluded.actual_minutes,
    rpe = excluded.rpe,
    notes = excluded.notes,
    post_state = excluded.post_state,
    hr_avg = coalesce(excluded.hr_avg, s.hr_avg),
    hr_max = coalesce(excluded.hr_max, s.hr_max),
    calories = coalesce(excluded.calories, s.calories),
    training_load = coalesce(excluded.training_load, s.training_load),
    aerobic_effect = coalesce(excluded.aerobic_effect, s.aerobic_effect),
    anaerobic_effect = coalesce(excluded.anaerobic_effect, s.anaerobic_effect),
    zone_vo2max_pct = coalesce(excluded.zone_vo2max_pct, s.zone_vo2max_pct),
    zone_intensive_pct = coalesce(excluded.zone_intensive_pct, s.zone_intensive_pct)
  where s.player_id = excluded.player_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Sesión no encontrada o sin permiso.' using errcode = '42501';
  end if;

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

revoke all on function public.finish_session(jsonb, jsonb) from public, anon;
grant execute on function public.finish_session(jsonb, jsonb) to authenticated, service_role;
