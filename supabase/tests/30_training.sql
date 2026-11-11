-- Fase 3: biblioteca inicial, save_workout y finish_session.
select set_config('request.jwt.claim.sub', '', false);

select tests.ok((select count(*) = 30 from public.exercises where player_id = '10000000-0000-0000-0000-000000000001' and not is_custom), 'cada jugador nuevo recibe 30 ejercicios base');
select tests.ok((select count(distinct category) = 6 from public.exercises where not is_custom and player_id = '10000000-0000-0000-0000-000000000001'), 'la biblioteca base cubre las 6 categorías');
select private.seed_default_exercises('10000000-0000-0000-0000-000000000001');
select tests.ok((select count(*) = 30 from public.exercises where player_id = '10000000-0000-0000-0000-000000000001' and not is_custom), 'la carga inicial no se duplica');

create temp table ids (k text primary key, v uuid);
grant select, insert, update on ids to authenticated;
insert into ids select 'ex1', id from public.exercises where player_id = '10000000-0000-0000-0000-000000000001' and name = 'Dominio de pelota';
insert into ids select 'ex2', id from public.exercises where player_id = '10000000-0000-0000-0000-000000000001' and name = 'Plancha';
insert into ids select 'exOtro', id from public.exercises where player_id = '10000000-0000-0000-0000-000000000002' limit 1;

-- PAPÁ arma un entrenamiento
select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
insert into ids values ('w1', public.save_workout(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Coordinación + técnica', 'est_minutes', '30', 'is_template', true),
  jsonb_build_array(
    jsonb_build_object('exercise_id', (select v from ids where k = 'ex1'), 'duration_sec', '480'),
    jsonb_build_object('exercise_id', (select v from ids where k = 'ex2'), 'sets', '3', 'duration_sec', '30', 'rest_sec', '30'))));
select tests.ok((select count(*) = 2 from public.workout_items where template_id = (select v from ids where k = 'w1')), 'papá guarda un entrenamiento con sus ejercicios');
select tests.ok((select exercise_id = (select v from ids where k = 'ex2') from public.workout_items where template_id = (select v from ids where k = 'w1') and position = 1), 'el orden de los ejercicios se respeta');

-- Reordenar: guardar de nuevo con otro orden y un ejercicio menos
select public.save_workout(
  jsonb_build_object('id', (select v from ids where k = 'w1'), 'player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Solo plancha', 'is_template', true),
  jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids where k = 'ex2'), 'sets', '2')));
select tests.ok((select count(*) = 1 from public.workout_items where template_id = (select v from ids where k = 'w1')), 'editar reemplaza los ejercicios del entrenamiento');
select tests.ok((select name = 'Solo plancha' from public.workout_templates where id = (select v from ids where k = 'w1')), 'editar actualiza los datos del entrenamiento');
select tests.throws($$select public.save_workout(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Vacío'), '[]'::jsonb)$$, '23514', 'un entrenamiento sin ejercicios se rechaza');
select tests.throws($$select public.save_workout(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Ajeno'), jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids where k = 'exOtro'))))$$, '23503', 'no se pueden usar ejercicios de otra familia');
reset role;

-- BENJA no puede armar entrenamientos pero sí registrar sesiones
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.throws($$select public.save_workout(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Mío'), jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids where k = 'ex1'))))$$, '42501', 'el jugador no puede crear entrenamientos');
select tests.throws($$select public.save_workout(jsonb_build_object('id', (select v from ids where k = 'w1'), 'player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Hack'), jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids where k = 'ex1'))))$$, '42501', 'el jugador no puede editar entrenamientos');

insert into ids values ('client', '99999999-0000-0000-0000-000000000001');
insert into ids values ('s1', public.finish_session(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'template_id', (select v from ids where k = 'w1'), 'title', 'Solo plancha',
    'started_at', now() - interval '25 minutes', 'ended_at', now(), 'actual_minutes', '25', 'rpe', '6', 'post_state', '4', 'client_id', (select v from ids where k = 'client')),
  jsonb_build_array(jsonb_build_object('workout_item_id', (select id from public.workout_items where template_id = (select v from ids where k = 'w1') limit 1), 'exercise_id', (select v from ids where k = 'ex2'), 'completed', true, 'sets_done', '2'))));
select tests.ok((select status = 'completed' and rpe = 6 and created_by = '00000000-0000-0000-0000-00000000000b' from public.workout_sessions where id = (select v from ids where k = 's1')), 'el jugador registra una sesión completa');
select tests.ok((select count(*) = 1 from public.session_results where session_id = (select v from ids where k = 's1')), 'la sesión guarda los resultados por ejercicio');

-- Reintento (por ejemplo, al volver la conexión): no duplica
select public.finish_session(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'title', 'Solo plancha', 'started_at', now() - interval '25 minutes', 'ended_at', now(), 'actual_minutes', '26', 'rpe', '7', 'client_id', (select v from ids where k = 'client')),
  jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids where k = 'ex2'), 'completed', true)));
select tests.ok((select count(*) = 1 from public.workout_sessions where client_id = (select v from ids where k = 'client')), 'reenviar la misma sesión no la duplica');
select tests.ok((select actual_minutes = 26 and rpe = 7 from public.workout_sessions where client_id = (select v from ids where k = 'client')), 'el reenvío actualiza los datos');
select tests.ok((select count(*) = 1 from public.session_results where session_id = (select v from ids where k = 's1')), 'el reenvío no duplica resultados');

-- Sesión libre (sin plantilla)
select public.finish_session(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'title', 'Fútbol en la plaza', 'started_at', now() - interval '1 hour', 'actual_minutes', '45', 'client_id', gen_random_uuid()), '[]'::jsonb);
select tests.ok((select count(*) = 1 from public.workout_sessions where title = 'Fútbol en la plaza'), 'se puede registrar un entrenamiento libre');

select tests.throws($$select public.finish_session(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000002', 'title', 'Ajena', 'started_at', now(), 'client_id', gen_random_uuid()), '[]'::jsonb)$$, '42501', 'no se pueden registrar sesiones de otro jugador');
reset role;

-- Otra familia no puede pisar una sesión ajena reutilizando su client_id
select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.throws($$select public.finish_session(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000002', 'title', 'Pisar', 'started_at', now(), 'client_id', '99999999-0000-0000-0000-000000000001'), '[]'::jsonb)$$, '42501', 'no se puede sobrescribir la sesión de otra familia');
reset role;
