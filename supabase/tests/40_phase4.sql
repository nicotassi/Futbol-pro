-- Fase 4: partidos, bienestar (semáforo), objetivos y evaluaciones.
select set_config('request.jwt.claim.sub', '', false);

-- ---------------------------------------------------------------------------
-- Semáforo: mismas reglas que src/features/wellness/traffic.ts
-- ---------------------------------------------------------------------------

create function tests.light(
  p_sleep numeric default null, p_quality int default null, p_energy int default null,
  p_soreness int default null, p_motivation int default null, p_overall int default null,
  p_hydration int default null, p_pain int default 0, p_sick boolean default false,
  p_discomfort text default null
) returns public.traffic_light language plpgsql as $$
declare w public.wellness_logs;
begin
  w.sleep_hours := p_sleep; w.sleep_quality := p_quality; w.energy := p_energy;
  w.soreness := p_soreness; w.motivation := p_motivation; w.overall := p_overall;
  w.hydration := p_hydration; w.pain_level := p_pain; w.sick := p_sick; w.discomfort := p_discomfort;
  return private.wellness_light(w);
end $$;
grant execute on function tests.light(numeric, int, int, int, int, int, int, int, boolean, text) to authenticated;

select tests.ok(tests.light(9.5, 4, 4, 2, 5, 4, 4) = 'green', 'semáforo: todo bien → verde');
select tests.ok(tests.light(p_overall => 4) = 'green', 'semáforo: con un solo dato bueno → verde');
select tests.ok(tests.light() is null, 'semáforo: sin datos no hay semáforo');
select tests.ok(tests.light(7, 4, 4, 2, 5, 4, 4) = 'yellow', 'semáforo: duerme menos de 8 horas → amarillo');
select tests.ok(tests.light(9, 2, 4, 2, 5, 4, 4) = 'yellow', 'semáforo: durmió mal → amarillo');
select tests.ok(tests.light(9, 4, 2, 2, 5, 4, 4) = 'yellow', 'semáforo: poca energía → amarillo');
select tests.ok(tests.light(9, 4, 4, 4, 5, 4, 4) = 'yellow', 'semáforo: mucho cansancio muscular → amarillo');
select tests.ok(tests.light(9, 4, 4, 2, 2, 4, 4) = 'yellow', 'semáforo: pocas ganas → amarillo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 4, 2) = 'yellow', 'semáforo: poca hidratación → amarillo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 2, 4) = 'yellow', 'semáforo: estado general bajo → amarillo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 4, 4, p_pain => 1) = 'yellow', 'semáforo: dolor leve → amarillo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 4, 4, p_discomfort => 'me duele un poco el tobillo') = 'yellow', 'semáforo: molestia anotada → amarillo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 4, 4, p_discomfort => '   ') = 'green', 'semáforo: molestia en blanco no cuenta');
select tests.ok(tests.light(9, 4, 4, 2, 5, 4, 4, p_pain => 2) = 'red', 'semáforo: dolor moderado → rojo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 4, 4, p_pain => 3) = 'red', 'semáforo: dolor fuerte → rojo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 4, 4, p_sick => true) = 'red', 'semáforo: enfermo → rojo');
select tests.ok(tests.light(9, 4, 4, 2, 5, 1, 4) = 'red', 'semáforo: estado general mínimo → rojo');
select tests.ok(tests.light(p_pain => 3, p_overall => 5) = 'red', 'semáforo: el rojo gana sobre el resto');
select tests.ok(tests.light(p_pain => 3) = 'red', 'semáforo: dolor fuerte sin otros datos → rojo');

-- ---------------------------------------------------------------------------
-- Partidos
-- ---------------------------------------------------------------------------
create temp table ids4 (k text primary key, v uuid);
grant select, insert, update on ids4 to authenticated;

-- BENJA registra un partido completo
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
insert into ids4 values ('m1', public.save_match(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'played_on', '2026-11-08',
    'opponent', 'Club Sur', 'competition', 'Liga infantil', 'goals_for', '3', 'goals_against', '1',
    'position', 'Mediocampista', 'minutes', '40', 'starter', 'true', 'client_id', '88888888-0000-0000-0000-000000000001'),
  jsonb_build_object('goals', '1', 'assists', '2', 'shots', '4', 'shots_on_target', '2', 'passes_ok', '', 'fouls', ''),
  jsonb_build_object('physical', '4', 'focus', '5', 'decisions', '3', 'offered_support', '4', 'helped_recover', '4',
    'rating', '4', 'did_well', 'Pedí la pelota', 'to_improve', 'Mirar antes de recibir', 'best_play_what', 'Un pase filtrado')));
select tests.ok((select opponent = 'Club Sur' and goals_for = 3 and starter and created_by = '00000000-0000-0000-0000-00000000000b' from public.matches where id = (select v from ids4 where k = 'm1')), 'el jugador registra un partido');
select tests.ok((select goals = 1 and assists = 2 and passes_ok is null and fouls is null from public.match_statistics where match_id = (select v from ids4 where k = 'm1')), 'lo no registrado queda vacío (nunca se asume cero)');
select tests.ok((select rating = 4 and did_well = 'Pedí la pelota' and best_play_what = 'Un pase filtrado' from public.match_reflections where match_id = (select v from ids4 where k = 'm1')), 'se guarda la evaluación personal y la mejor jugada');

-- Reenvío (cola sin conexión) y edición: no duplica
select public.save_match(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'played_on', '2026-11-08', 'opponent', 'Club Sur FC',
    'goals_for', '3', 'goals_against', '1', 'minutes', '45', 'client_id', '88888888-0000-0000-0000-000000000001'),
  jsonb_build_object('goals', '2', 'assists', '2'), null);
select tests.ok((select count(*) = 1 from public.matches where client_id = '88888888-0000-0000-0000-000000000001'), 'reenviar el mismo partido no lo duplica');
select tests.ok((select opponent = 'Club Sur FC' and minutes = 45 from public.matches where client_id = '88888888-0000-0000-0000-000000000001'), 'el reenvío actualiza el partido');
select tests.ok((select goals = 2 and shots is null from public.match_statistics where match_id = (select v from ids4 where k = 'm1')), 'las estadísticas se reemplazan y no se duplican');
select tests.ok((select count(*) = 1 from public.match_reflections where match_id = (select v from ids4 where k = 'm1')), 'sin evaluación nueva, la anterior se conserva');

-- Validaciones
select tests.throws($$select public.save_match(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'played_on', '2026-11-08', 'opponent', 'X', 'client_id', gen_random_uuid()), jsonb_build_object('shots', '2', 'shots_on_target', '5'), null)$$, '23514', 'los tiros al arco no pueden superar a los tiros');
select tests.throws($$select public.save_match(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'played_on', '2026-11-08', 'opponent', 'X', 'client_id', gen_random_uuid()), '{}'::jsonb, jsonb_build_object('rating', '9'))$$, '23514', 'la autoevaluación va de 1 a 5');
select tests.ok((select count(*) = 0 from public.matches where opponent = 'X'), 'un partido inválido no deja datos a medias');
select tests.throws($$select public.save_match(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000002', 'played_on', '2026-11-08', 'opponent', 'Ajeno', 'client_id', gen_random_uuid()), null, null)$$, '42501', 'no se pueden registrar partidos de otro jugador');

-- "Quitar" un partido = marcarlo (nada se borra)
update public.matches set removed = true where id = (select v from ids4 where k = 'm1');
select tests.ok((select removed from public.matches where id = (select v from ids4 where k = 'm1')), 'quitar un partido lo marca y lo conserva');
reset role;

-- Otra familia no ve ni pisa partidos ajenos
select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok((select count(*) = 0 from public.matches where opponent like 'Club Sur%'), 'otra familia no ve los partidos');
select tests.ok((select count(*) = 0 from public.match_statistics where match_id = (select v from ids4 where k = 'm1')), 'otra familia no ve las estadísticas');
select tests.ok((select count(*) = 0 from public.match_reflections where match_id = (select v from ids4 where k = 'm1')), 'otra familia no ve la evaluación personal');
select tests.throws($$select public.save_match(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000002', 'played_on', '2026-11-09', 'opponent', 'Pisar', 'client_id', '88888888-0000-0000-0000-000000000001'), null, null)$$, '42501', 'no se puede sobrescribir el partido de otra familia');
reset role;

-- ---------------------------------------------------------------------------
-- Bienestar
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
insert into ids4 values ('w1', public.save_wellness(jsonb_build_object(
  'player_id', '10000000-0000-0000-0000-000000000001', 'log_date', '2026-11-10', 'sleep_hours', '9.5',
  'sleep_quality', '4', 'energy', '4', 'soreness', '2', 'motivation', '5', 'overall', '4', 'hydration', '4',
  'client_id', '77777777-0000-0000-0000-000000000001')));
select tests.ok((select traffic_light = 'green' and sleep_hours = 9.5 from public.wellness_logs where id = (select v from ids4 where k = 'w1')), 'el bienestar se guarda con semáforo verde');

-- Guardar de nuevo el mismo día lo actualiza y recalcula el semáforo
select public.save_wellness(jsonb_build_object(
  'player_id', '10000000-0000-0000-0000-000000000001', 'log_date', '2026-11-10', 'sleep_hours', '9.5',
  'overall', '4', 'pain_level', '2', 'discomfort', 'Me duele la rodilla', 'client_id', gen_random_uuid()));
select tests.ok((select count(*) = 1 from public.wellness_logs where log_date = '2026-11-10'), 'un solo registro por día');
select tests.ok((select traffic_light = 'red' and pain_level = 2 from public.wellness_logs where log_date = '2026-11-10'), 'al actualizar el día, el semáforo se recalcula');

-- El semáforo no se puede falsear desde la app
update public.wellness_logs set traffic_light = 'green' where id = (select v from ids4 where k = 'w1');
select tests.ok((select traffic_light = 'red' from public.wellness_logs where id = (select v from ids4 where k = 'w1')), 'el semáforo lo calcula la base y no se puede forzar');

select tests.throws($$select public.save_wellness(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'log_date', '2026-11-11', 'energy', '9', 'client_id', gen_random_uuid()))$$, '23514', 'las escalas van de 1 a 5');
select tests.throws($$select public.save_wellness(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000002', 'log_date', '2026-11-11', 'energy', '3', 'client_id', gen_random_uuid()))$$, '42501', 'no se puede registrar el bienestar de otro jugador');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok((select count(*) = 0 from public.wellness_logs where log_date = '2026-11-10'), 'otra familia no ve el bienestar');
select tests.throws($$select public.save_wellness(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000002', 'log_date', '2026-11-10', 'energy', '3', 'client_id', '77777777-0000-0000-0000-000000000001'))$$, '23505', 'no se puede reutilizar el identificador de otra familia');
reset role;

-- ---------------------------------------------------------------------------
-- Objetivos: Benja propone, papá aprueba y administra
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
insert into ids4 select 'g1', id from public.goals where false;
with g as (insert into public.goals (player_id, name, progress, status) values ('10000000-0000-0000-0000-000000000001', 'Mejorar la pierna izquierda', 10, 'in_progress') returning id)
insert into ids4 select 'g1', id from g;
select tests.ok((select not approved and proposed_by = '00000000-0000-0000-0000-00000000000b' from public.goals where id = (select v from ids4 where k = 'g1')), 'el jugador propone un objetivo sin aprobar');
select tests.throws($$insert into public.goals (player_id, name, approved) values ('10000000-0000-0000-0000-000000000001', 'Auto-aprobado', true)$$, '42501', 'el jugador no puede aprobar sus propios objetivos');
update public.goals set progress = 40 where id = (select v from ids4 where k = 'g1');
select tests.ok((select progress = 40 from public.goals where id = (select v from ids4 where k = 'g1')), 'el jugador actualiza el progreso de lo que propuso');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
update public.goals set approved = true where id = (select v from ids4 where k = 'g1');
select tests.ok((select approved from public.goals where id = (select v from ids4 where k = 'g1')), 'papá aprueba el objetivo');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.ok(tests.affected($$update public.goals set progress = 90 where id = (select v from ids4 where k = 'g1')$$) = 0, 'aprobado, el jugador ya no lo puede modificar');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
update public.goals set removed = true, progress = 100, status = 'completed' where id = (select v from ids4 where k = 'g1');
select tests.ok((select removed and status = 'completed' from public.goals where id = (select v from ids4 where k = 'g1')), 'quitar un objetivo lo marca y lo conserva');
reset role;

-- ---------------------------------------------------------------------------
-- Evaluaciones físicas: solo papá las carga; las dos cuentas las ven
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.throws($$insert into public.assessments (player_id, assessed_on, dimension, test_name, value, unit, score) values ('10000000-0000-0000-0000-000000000001', '2026-11-09', 'speed', 'Carrera 20 m', 4.2, 's', 7)$$, '42501', 'el jugador no puede cargar evaluaciones');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
insert into public.assessments (player_id, assessed_on, dimension, test_name, value, unit, score) values ('10000000-0000-0000-0000-000000000001', '2026-11-09', 'speed', 'Carrera 20 m', 4.2, 's', 7);
select tests.ok((select count(*) = 1 from public.assessments where test_name = 'Carrera 20 m'), 'papá carga una evaluación física');
select tests.throws($$insert into public.assessments (player_id, assessed_on, dimension, test_name, score) values ('10000000-0000-0000-0000-000000000001', '2026-11-09', 'speed', 'Carrera', 11)$$, '23514', 'el puntaje va de 1 a 10');
update public.assessments set removed = true where test_name = 'Carrera 20 m';
select tests.ok((select count(*) = 1 and bool_and(removed) from public.assessments where test_name = 'Carrera 20 m'), 'quitar una evaluación la marca y la conserva');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.ok((select count(*) = 1 from public.assessments where test_name = 'Carrera 20 m'), 'el jugador ve sus evaluaciones');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok((select count(*) = 0 from public.assessments where test_name = 'Carrera 20 m'), 'otra familia no ve las evaluaciones');
select tests.ok((select count(*) = 0 from public.goals where name = 'Mejorar la pierna izquierda'), 'otra familia no ve los objetivos');
reset role;
