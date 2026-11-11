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
