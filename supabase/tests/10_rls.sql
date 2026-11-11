-- =============================================================================
-- Pruebas de seguridad (RLS, privilegios e integridad).
-- Se ejecutan con scripts/db-test.sh. Cualquier fallo aborta con error.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Utilidades de prueba
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

create table tests.results (n serial, name text, ok boolean);
grant insert, select on tests.results to anon, authenticated, service_role;
grant usage on sequence tests.results_n_seq to anon, authenticated, service_role;

create function tests.ok(cond boolean, name text) returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FALLÓ: %', name;
  end if;
  insert into tests.results (name, ok) values (name, true);
end $$;

-- Ejecuta SQL y verifica que falle con el código esperado.
create function tests.throws(q text, expected_state text, name text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    if sqlstate = expected_state then
      insert into tests.results (name, ok) values (name, true);
      return;
    end if;
    raise exception 'FALLÓ: % (se esperaba %, ocurrió % — %)', name, expected_state, sqlstate, sqlerrm;
  end;
  raise exception 'FALLÓ: % (debía fallar y no falló)', name;
end $$;

-- Ejecuta SQL y devuelve la cantidad de filas afectadas.
create function tests.affected(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Actuar como un usuario (equivale al JWT que envía la app).
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false);
$$;
grant execute on function tests.login(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Datos de prueba: dos familias independientes
-- ---------------------------------------------------------------------------
insert into public.account_invites (email) values
  ('papa@example.com'), ('benja@jugador.futbolista-pro.app'), ('otro.papa@example.com'), ('otro@jugador.futbolista-pro.app');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'papa@example.com', '{"fp_invited":true}', '{"display_name":"Papá"}'),
  ('00000000-0000-0000-0000-00000000000b', 'benja@jugador.futbolista-pro.app', '{"fp_invited":true}', '{"display_name":"Benja","username":"Benja"}'),
  ('00000000-0000-0000-0000-00000000000c', 'otro.papa@example.com', '{"fp_invited":true}', '{"display_name":"Otro papá"}'),
  ('00000000-0000-0000-0000-00000000000d', 'otro@jugador.futbolista-pro.app', '{"fp_invited":true}', '{"username":"otro"}');

select tests.ok((select count(*) = 4 from public.profiles), 'se crea un perfil por cada usuario de Auth');
select tests.throws($$insert into auth.users (email) values ('intruso@example.com')$$, '42501', 'el registro público está cerrado (sin invitación no se crea la cuenta)');
select tests.ok((select count(*) = 0 from public.account_invites), 'cada invitación se consume al crear la cuenta');
insert into public.account_invites (email, expires_at) values ('tarde@example.com', now() - interval '1 second');
select tests.throws($$insert into auth.users (email) values ('tarde@example.com')$$, '42501', 'una invitación vencida no sirve');
delete from public.account_invites;
select tests.ok((select username::text = 'benja' from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'el usuario se guarda en minúsculas');
select tests.ok((select display_name = 'otro' from public.profiles where id = '00000000-0000-0000-0000-00000000000d'), 'sin nombre visible se usa la parte local del email');

insert into public.players (id, first_name, position) values
  ('10000000-0000-0000-0000-000000000001', 'Benja', 'Mediocampista'),
  ('10000000-0000-0000-0000-000000000002', 'Otro', 'Delantero');

insert into public.player_access (user_id, player_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'player'),
  ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000002', 'admin'),
  ('00000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000002', 'player');

insert into public.exercises (id, player_id, name, category) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Escalera de coordinación', 'coordination'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Sprint 10 m', 'speed');

insert into public.workout_sessions (id, player_id, title, client_id) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Técnica', gen_random_uuid()),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Velocidad', gen_random_uuid());

insert into storage.objects (bucket_id, name) values
  ('watch-screenshots', '10000000-0000-0000-0000-000000000001/s1/resumen.png'),
  ('watch-screenshots', '10000000-0000-0000-0000-000000000002/s2/resumen.png');

-- ---------------------------------------------------------------------------
-- Usuario anónimo: sin acceso
-- ---------------------------------------------------------------------------
set role anon;
select tests.throws('select * from public.players', '42501', 'anónimo no puede leer jugadores');
select tests.throws('select * from public.workout_sessions', '42501', 'anónimo no puede leer sesiones');
reset role;

-- ---------------------------------------------------------------------------
-- BENJA (jugador)
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;

select tests.ok((select count(*) = 1 from public.players), 'jugador ve solo su propio perfil de jugador');
select tests.ok((select count(*) = 0 from public.players where id = '10000000-0000-0000-0000-000000000002'), 'jugador no ve a otros jugadores');
select tests.ok((select count(*) = 1 from public.player_access), 'jugador ve solo su propio vínculo');
select tests.ok((select count(*) = 2 from public.profiles), 'jugador ve su perfil y el de papá');
select tests.ok((select count(*) = 0 from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 'jugador no ve usuarios de otra familia');

select tests.ok(tests.affected($$update public.players set first_name = 'X' where id = '10000000-0000-0000-0000-000000000001'$$) = 0, 'jugador no puede editar el perfil de jugador');
select tests.throws($$insert into public.players (first_name) values ('Nuevo')$$, '42501', 'jugador no puede crear jugadores');
select tests.throws($$insert into public.player_access values ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', 'admin')$$, '42501', 'jugador no puede darse acceso a otro jugador');
select tests.throws($$update public.profiles set username = 'hack' where id = '00000000-0000-0000-0000-00000000000b'$$, '42501', 'jugador no puede cambiar su usuario');
select tests.ok(tests.affected($$update public.profiles set display_name = 'Benja P.' where id = '00000000-0000-0000-0000-00000000000b'$$) = 1, 'jugador puede cambiar su nombre visible');
select tests.ok(tests.affected($$update public.profiles set display_name = 'X' where id = '00000000-0000-0000-0000-00000000000a'$$) = 0, 'jugador no puede cambiar el nombre de papá');

-- Contenido administrado por papá
select tests.ok((select count(*) = 31 from public.exercises), 'jugador ve los ejercicios de su biblioteca (30 base + 1)');
select tests.throws($$insert into public.exercises (player_id, name, category) values ('10000000-0000-0000-0000-000000000001', 'Nuevo', 'speed')$$, '42501', 'jugador no puede crear ejercicios');
select tests.ok(tests.affected($$delete from public.exercises$$) = 0, 'jugador no puede borrar ejercicios');
select tests.throws($$insert into public.calendar_events (player_id, title, category, event_date) values ('10000000-0000-0000-0000-000000000001', 'Partido', 'match', current_date)$$, '42501', 'jugador no puede crear eventos del calendario');
select tests.throws($$insert into public.achievements (player_id, code) values ('10000000-0000-0000-0000-000000000001', 'trampa')$$, '42501', 'jugador no puede otorgarse logros');
select tests.throws($$insert into public.xp_events (player_id, source_type, source_id, points) values ('10000000-0000-0000-0000-000000000001', 'x', gen_random_uuid(), 500)$$, '42501', 'jugador no puede otorgarse puntos');

-- Registros propios del día a día
select tests.ok((select count(*) = 1 from public.workout_sessions), 'jugador ve solo las sesiones de su jugador');
insert into public.workout_sessions (id, player_id, title, client_id, created_by)
  values ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-000000000001', 'Dominio', gen_random_uuid(), '00000000-0000-0000-0000-00000000000a');
select tests.ok((select created_by = '00000000-0000-0000-0000-00000000000b' from public.workout_sessions where id = '30000000-0000-0000-0000-0000000000b1'), 'el autor de la sesión es siempre el usuario actual');
select tests.ok(tests.affected($$update public.workout_sessions set rpe = 6, status = 'completed', ended_at = now() where id = '30000000-0000-0000-0000-0000000000b1'$$) = 1, 'jugador puede completar su sesión');
select tests.throws($$update public.workout_sessions set created_by = '00000000-0000-0000-0000-00000000000a' where id = '30000000-0000-0000-0000-0000000000b1'$$, '42501', 'nadie puede cambiar el autor de un registro');
select tests.ok(tests.affected($$delete from public.workout_sessions where id = '30000000-0000-0000-0000-0000000000b1'$$) = 0, 'jugador no puede borrar sesiones');
select tests.throws($$insert into public.workout_sessions (player_id, title, client_id) values ('10000000-0000-0000-0000-000000000002', 'Intruso', gen_random_uuid())$$, '42501', 'jugador no puede cargar sesiones a otro jugador');
select tests.ok(tests.affected($$update public.workout_sessions set title = 'X' where id = '30000000-0000-0000-0000-000000000002'$$) = 0, 'jugador no puede editar sesiones de otro jugador');
select tests.throws($$update public.workout_sessions set player_id = '10000000-0000-0000-0000-000000000002' where id = '30000000-0000-0000-0000-0000000000b1'$$, '42501', 'jugador no puede mover una sesión a otro jugador');

insert into public.wellness_logs (player_id, log_date, energy, client_id) values ('10000000-0000-0000-0000-000000000001', current_date, 4, gen_random_uuid());
select tests.ok((select count(*) = 1 from public.wellness_logs), 'jugador puede registrar su bienestar');
select tests.throws($$insert into public.wellness_logs (player_id, log_date, client_id) values ('10000000-0000-0000-0000-000000000001', current_date, gen_random_uuid())$$, '23505', 'un solo registro de bienestar por día');

insert into public.matches (id, player_id, played_on, opponent, client_id) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 'Club Rival', gen_random_uuid());
insert into public.match_statistics (match_id, player_id, goals) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1);
select tests.ok((select assists is null from public.match_statistics), 'estadística no registrada queda vacía (no cero)');

-- Objetivos: el jugador propone, papá aprueba
insert into public.goals (id, player_id, name) values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Mejorar pierna izquierda');
select tests.throws($$insert into public.goals (player_id, name, approved) values ('10000000-0000-0000-0000-000000000001', 'Autoaprobado', true)$$, '42501', 'jugador no puede crear objetivos ya aprobados');
select tests.throws($$update public.goals set approved = true where id = '50000000-0000-0000-0000-000000000001'$$, '42501', 'jugador no puede aprobar su propio objetivo');

-- Reloj: ve pero no carga ni confirma
select tests.throws($$insert into public.watch_uploads (player_id, workout_session_id, image_path, image_sha256) values ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'x.png', repeat('a', 64))$$, '42501', 'jugador no puede cargar capturas del reloj');

-- Storage
select tests.ok((select count(*) = 1 from storage.objects where bucket_id = 'watch-screenshots'), 'jugador ve solo las capturas de su jugador');
select tests.throws($$insert into storage.objects (bucket_id, name, owner_id) values ('watch-screenshots', '10000000-0000-0000-0000-000000000001/s1/otra.png', '00000000-0000-0000-0000-00000000000b')$$, '42501', 'jugador no puede subir capturas del reloj');
insert into storage.objects (bucket_id, name, owner_id) values ('player-media', '10000000-0000-0000-0000-000000000001/jugada.mp4', '00000000-0000-0000-0000-00000000000b');
select tests.ok(true, 'jugador puede subir su mejor jugada');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('player-media', '10000000-0000-0000-0000-000000000002/jugada.mp4')$$, '42501', 'jugador no puede subir archivos a otro jugador');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('player-media', 'sin-carpeta.mp4')$$, '42501', 'archivos fuera de la carpeta de un jugador se rechazan');

reset role;

-- ---------------------------------------------------------------------------
-- PAPÁ (administrador)
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;

select tests.ok((select count(*) = 2 from public.player_access), 'papá ve todos los vínculos de su jugador');
select tests.ok(tests.affected($$update public.players set club = 'Club Atlético', birth_date = '2015-03-01' where id = '10000000-0000-0000-0000-000000000001'$$) = 1, 'papá puede editar el perfil del jugador');
select tests.ok(tests.affected($$update public.players set club = 'X' where id = '10000000-0000-0000-0000-000000000002'$$) = 0, 'papá no puede editar jugadores ajenos');
select tests.ok((select count(*) = 0 from public.exercises where player_id = '10000000-0000-0000-0000-000000000002'), 'papá no ve la biblioteca de otra familia');

insert into public.exercises (player_id, name, category) values ('10000000-0000-0000-0000-000000000001', 'Pases contra la pared', 'technique');
select tests.ok((select count(*) = 32 from public.exercises), 'papá puede crear ejercicios');
select tests.ok(tests.affected($$update public.goals set approved = true, status = 'in_progress' where id = '50000000-0000-0000-0000-000000000001'$$) = 1, 'papá puede aprobar objetivos');
select tests.ok((select proposed_by = '00000000-0000-0000-0000-00000000000b' from public.goals where id = '50000000-0000-0000-0000-000000000001'), 'aprobar no cambia quién propuso el objetivo');
select tests.ok(tests.affected($$delete from public.workout_sessions where id = '30000000-0000-0000-0000-0000000000b1'$$) = 1, 'papá puede borrar sesiones');
select tests.throws($$insert into public.player_access values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002', 'admin')$$, '42501', 'papá no puede darse acceso a otro jugador');

-- Reloj: carga, revisión y confirmación
insert into public.watch_uploads (id, player_id, workout_session_id, image_path, image_sha256)
  values ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/s1/resumen.png', repeat('a', 64));
select tests.throws($$insert into public.watch_uploads (player_id, workout_session_id, image_path, image_sha256) values ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'otra/ruta.png', repeat('a', 64))$$, '23505', 'la misma captura no se registra dos veces en una sesión');

insert into public.watch_metrics (id, upload_id, player_id, workout_session_id, metric_type, metric_value, metric_unit, confidence) values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'heart_rate_avg', '148', 'lpm', 0.92),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'heart_rate_avg', '184', 'lpm', 0.40);

select tests.ok((select count(*) = 0 from public.confirmed_watch_metrics), 'métricas sin revisar no entran en estadísticas');
update public.watch_metrics set validation_status = 'corrected', confirmed_value = '146' where id = '70000000-0000-0000-0000-000000000001';
select tests.ok((select confirmed_by = '00000000-0000-0000-0000-00000000000a' and confirmed_at is not null and metric_value = '148' from public.watch_metrics where id = '70000000-0000-0000-0000-000000000001'), 'la corrección guarda quién, cuándo y conserva el valor original');
select tests.ok((select count(*) = 1 and min(value) = '146' from public.confirmed_watch_metrics), 'solo los valores revisados entran en estadísticas');
select tests.throws($$update public.watch_metrics set validation_status = 'confirmed', confirmed_value = '184' where id = '70000000-0000-0000-0000-000000000002'$$, '23505', 'una sola métrica validada por sesión (sin duplicados entre capturas)');
select tests.throws($$update public.watch_metrics set metric_value = '150' where id = '70000000-0000-0000-0000-000000000001'$$, '42501', 'el valor original extraído no se puede reescribir');
select tests.throws($$update public.watch_metrics set validation_status = 'confirmed', confirmed_value = null where id = '70000000-0000-0000-0000-000000000002'$$, '23514', 'confirmar exige un valor');
insert into storage.objects (bucket_id, name, owner_id) values ('watch-screenshots', '10000000-0000-0000-0000-000000000001/s1/grafico.png', '00000000-0000-0000-0000-00000000000a');
select tests.ok(true, 'papá puede subir capturas del reloj');
select tests.ok(tests.affected($$delete from storage.objects where bucket_id = 'player-media'$$) = 1, 'papá puede borrar archivos de su jugador');

reset role;

-- ---------------------------------------------------------------------------
-- Otra familia: aislamiento total
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok((select count(*) = 1 from public.players where id = '10000000-0000-0000-0000-000000000002'), 'otra familia ve solo a su jugador');
select tests.ok((select count(*) = 0 from public.watch_metrics), 'otra familia no ve métricas del reloj ajenas');
select tests.ok((select count(*) = 0 from public.goals), 'otra familia no ve objetivos ajenos');
select tests.ok((select count(*) = 0 from public.matches), 'otra familia no ve partidos ajenos');
select tests.ok((select count(*) = 1 from storage.objects), 'otra familia ve solo sus archivos');
reset role;

-- ---------------------------------------------------------------------------
-- Integridad (como servidor)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '', false);
select tests.throws($$insert into public.session_results (session_id, player_id) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')$$, '23503', 'no se pueden mezclar datos de jugadores distintos');
select tests.throws($$insert into public.workout_sessions (player_id, title, client_id) select player_id, 'Duplicada', client_id from public.workout_sessions limit 1$$, '23505', 'reintentos offline no duplican sesiones (client_id único)');
select tests.throws($$insert into public.match_statistics (match_id, player_id, shots, shots_on_target) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 3, 1)$$, '23505', 'una sola fila de estadísticas por partido');
select tests.throws($$update public.match_statistics set shots = 1, shots_on_target = 3$$, '23514', 'remates al arco no pueden superar los remates');
select tests.throws($$insert into public.wellness_logs (player_id, log_date, energy, client_id) values ('10000000-0000-0000-0000-000000000001', current_date - 1, 9, gen_random_uuid())$$, '23514', 'escalas de bienestar limitadas de 1 a 5');

-- Toda tabla de public tiene RLS activado
select tests.ok(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  'todas las tablas tienen RLS activado');

