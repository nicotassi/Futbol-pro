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
