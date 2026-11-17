-- =============================================================================
-- FUTBOLISTA PRO · 1400 · Módulos de ejercicios con repeticiones
-- =============================================================================
-- Un entrenamiento se arma con módulos: cada módulo agrupa varios ejercicios y
-- se repite N veces ("vueltas"). Los ejercicios de un mismo módulo comparten el
-- número de módulo (block). Los entrenamientos existentes quedan como un único
-- módulo que se hace una vez.
-- =============================================================================

alter table public.workout_items
  add column block         smallint not null default 0 check (block between 0 and 49),
  add column block_repeats smallint not null default 1 check (block_repeats between 1 and 50),
  add column block_name    text check (char_length(block_name) <= 60);

comment on column public.workout_items.block is 'Número de módulo (0, 1, 2…). Ejercicios con el mismo número forman un módulo.';
comment on column public.workout_items.block_repeats is 'Cuántas veces se repite el módulo completo (vueltas).';

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
      block = coalesce(nullif(v_item ->> 'block', '')::smallint, 0),
      block_repeats = coalesce(nullif(v_item ->> 'block_repeats', '')::smallint, 1),
      block_name = nullif(v_item ->> 'block_name', ''),
      removed = false
    where template_id = v_id and position = v_pos;
    if not found then
      insert into public.workout_items (template_id, player_id, exercise_id, position, sets, reps, duration_sec, rest_sec, instructions, block, block_repeats, block_name)
      values (
        v_id, v_player, (v_item ->> 'exercise_id')::uuid, v_pos,
        nullif(v_item ->> 'sets', '')::smallint,
        nullif(v_item ->> 'reps', '')::smallint,
        nullif(v_item ->> 'duration_sec', '')::integer,
        nullif(v_item ->> 'rest_sec', '')::integer,
        nullif(v_item ->> 'instructions', ''),
        coalesce(nullif(v_item ->> 'block', '')::smallint, 0),
        coalesce(nullif(v_item ->> 'block_repeats', '')::smallint, 1),
        nullif(v_item ->> 'block_name', '')
      );
    end if;
  end loop;

  update public.workout_items set removed = true
  where template_id = v_id and position >= v_count and not removed;

  return v_id;
end;
$$;

revoke all on function public.save_workout(jsonb, jsonb) from public, anon;
grant execute on function public.save_workout(jsonb, jsonb) to authenticated, service_role;
