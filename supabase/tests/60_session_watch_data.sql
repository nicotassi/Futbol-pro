-- Datos del reloj cargados a mano en cada entrenamiento.
select set_config('request.jwt.claim.sub', '', false);
create temp table ids6 (k text primary key, v uuid);
grant select, insert, update on ids6 to authenticated;

select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
insert into ids6 values ('s', public.finish_session(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'title', 'Con reloj', 'started_at', now() - interval '30 minutes',
    'client_id', '66666666-0000-0000-0000-000000000001', 'hr_avg', '142', 'hr_max', '178', 'calories', '320', 'training_load', '95',
    'aerobic_effect', '3.4', 'anaerobic_effect', '1.2', 'zone_vo2max_pct', '12.5', 'zone_intensive_pct', '30'), '[]'::jsonb));
select tests.ok((select hr_avg = 142 and hr_max = 178 and calories = 320 and training_load = 95 and aerobic_effect = 3.4 and anaerobic_effect = 1.2 and zone_vo2max_pct = 12.5 and zone_intensive_pct = 30 from public.workout_sessions where id = (select v from ids6 where k = 's')), 'se guardan los datos del reloj de la sesión');

-- Una sesión sin datos del reloj los deja vacíos (no se inventa nada)
insert into ids6 values ('vacia', public.finish_session(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'title', 'Sin reloj', 'started_at', now(), 'client_id', gen_random_uuid()), '[]'::jsonb));
select tests.ok((select hr_avg is null and calories is null and aerobic_effect is null and zone_vo2max_pct is null from public.workout_sessions where id = (select v from ids6 where k = 'vacia')), 'sin datos del reloj quedan vacíos');

-- Reenviar la sesión sin esos datos no los pisa
select public.finish_session(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'title', 'Con reloj', 'started_at', now(), 'client_id', '66666666-0000-0000-0000-000000000001', 'actual_minutes', '31'), '[]'::jsonb);
select tests.ok((select hr_avg = 142 and actual_minutes = 31 from public.workout_sessions where id = (select v from ids6 where k = 's')), 'reenviar la sesión no borra los datos del reloj cargados');

-- Se pueden completar después
update public.workout_sessions set calories = 340, hr_max = 180 where id = (select v from ids6 where k = 's');
select tests.ok((select calories = 340 and hr_max = 180 from public.workout_sessions where id = (select v from ids6 where k = 's')), 'los datos del reloj se pueden corregir después');

-- Validaciones
select tests.throws($$update public.workout_sessions set hr_avg = 190, hr_max = 150 where id = (select v from ids6 where k = 's')$$, '23514', 'el ritmo promedio no puede superar al máximo');
select tests.throws($$update public.workout_sessions set aerobic_effect = 5.5 where id = (select v from ids6 where k = 's')$$, '23514', 'el efecto de entrenamiento va de 1 a 5');
select tests.throws($$update public.workout_sessions set anaerobic_effect = 0.5 where id = (select v from ids6 where k = 's')$$, '23514', 'el efecto anaeróbico no baja de 1');
select tests.throws($$update public.workout_sessions set zone_vo2max_pct = 70, zone_intensive_pct = 40 where id = (select v from ids6 where k = 's')$$, '23514', 'las zonas no pueden sumar más de 100 %');
select tests.throws($$update public.workout_sessions set zone_intensive_pct = 120 where id = (select v from ids6 where k = 's')$$, '23514', 'un porcentaje no puede pasar de 100');
select tests.throws($$update public.workout_sessions set hr_avg = 10 where id = (select v from ids6 where k = 's')$$, '23514', 'ritmo cardíaco fuera de rango');
reset role;

-- Otra familia no los ve
select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok((select count(*) = 0 from public.workout_sessions where client_id = '66666666-0000-0000-0000-000000000001'), 'otra familia no ve los datos del reloj');
reset role;

-- Editar una sesión ya hecha (nombre, fecha, minutos, esfuerzo y ejercicios completados)
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
insert into ids6 values ('r', public.finish_session(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'title', 'Para editar', 'started_at', now() - interval '2 days', 'ended_at', now() - interval '2 days' + interval '30 minutes', 'actual_minutes', '30', 'rpe', '5', 'client_id', gen_random_uuid()),
  jsonb_build_array(jsonb_build_object('completed', false))));
update public.workout_sessions set title = 'Editado', actual_minutes = 55, rpe = 8, started_at = now() - interval '3 days', ended_at = now() - interval '3 days' + interval '55 minutes', notes = null
  where id = (select v from ids6 where k = 'r');
select tests.ok((select title = 'Editado' and actual_minutes = 55 and rpe = 8 and notes is null from public.workout_sessions where id = (select v from ids6 where k = 'r')), 'el jugador edita una sesión ya registrada');
update public.session_results set completed = true where session_id = (select v from ids6 where k = 'r');
select tests.ok((select bool_and(completed) from public.session_results where session_id = (select v from ids6 where k = 'r')), 'se puede cambiar qué ejercicios se completaron');
select tests.throws($$update public.workout_sessions set ended_at = started_at - interval '1 hour' where id = (select v from ids6 where k = 'r')$$, '23514', 'el fin no puede ser anterior al inicio');
select tests.throws($$update public.workout_sessions set title = 'X' where id = (select v from ids6 where k = 'r')$$, '23514', 'el nombre necesita al menos 2 letras');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok(tests.affected($$update public.workout_sessions set title = 'Hack' where id = (select v from ids6 where k = 'r')$$) = 0, 'otra familia no puede editar la sesión');
select tests.ok(tests.affected($$update public.session_results set completed = false where session_id = (select v from ids6 where k = 'r')$$) = 0, 'otra familia no puede cambiar los ejercicios');
reset role;

-- Eliminar una sesión: solo papá; se van también sus ejercicios
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.ok(tests.affected($$delete from public.workout_sessions where id = (select v from ids6 where k = 'r')$$) = 0, 'el jugador no puede eliminar sesiones');
reset role;
select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok(tests.affected($$delete from public.workout_sessions where id = (select v from ids6 where k = 'r')$$) = 0, 'otra familia no puede eliminar sesiones ajenas');
reset role;
select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select tests.ok(tests.affected($$delete from public.workout_sessions where id = (select v from ids6 where k = 'r')$$) = 1, 'papá elimina la sesión');
select tests.ok((select count(*) = 0 from public.workout_sessions where id = (select v from ids6 where k = 'r')), 'la sesión ya no existe');
select tests.ok((select count(*) = 0 from public.session_results where session_id = (select v from ids6 where k = 'r')), 'sus ejercicios se eliminan con ella');
reset role;
