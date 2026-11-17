-- Módulos de ejercicios con repeticiones.
select set_config('request.jwt.claim.sub', '', false);
create temp table ids7 (k text primary key, v uuid);
grant select, insert, update on ids7 to authenticated;
insert into ids7 select 'ex1', id from public.exercises where player_id = '10000000-0000-0000-0000-000000000001' and name = 'Dominio de pelota';
insert into ids7 select 'ex2', id from public.exercises where player_id = '10000000-0000-0000-0000-000000000001' and name = 'Plancha';
insert into ids7 select 'ex3', id from public.exercises where player_id = '10000000-0000-0000-0000-000000000001' and name = 'Sentadillas' limit 1;

select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
insert into ids7 values ('w', public.save_workout(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Con módulos', 'is_template', true),
  jsonb_build_array(
    jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex1'), 'block', '0', 'block_repeats', '3', 'block_name', 'Calentamiento'),
    jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex2'), 'block', '0', 'block_repeats', '3', 'block_name', 'Calentamiento'),
    jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex1'), 'block', '1', 'block_repeats', '2', 'block_name', ''))));
select tests.ok((select count(*) = 3 from public.workout_items where template_id = (select v from ids7 where k = 'w') and not removed), 'se guardan los ejercicios de dos módulos');
select tests.ok((select count(distinct block) = 2 from public.workout_items where template_id = (select v from ids7 where k = 'w') and not removed), 'quedan dos módulos');
select tests.ok((select block_repeats = 3 and block_name = 'Calentamiento' from public.workout_items where template_id = (select v from ids7 where k = 'w') and position = 0), 'el módulo guarda sus repeticiones y su nombre');
select tests.ok((select block = 1 and block_repeats = 2 and block_name is null from public.workout_items where template_id = (select v from ids7 where k = 'w') and position = 2), 'el segundo módulo tiene sus propias repeticiones');

-- Sin datos de módulo: un único módulo que se hace una vez (compatibilidad)
insert into ids7 values ('w2', public.save_workout(
  jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Clásico', 'is_template', true),
  jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex1')))));
select tests.ok((select block = 0 and block_repeats = 1 from public.workout_items where template_id = (select v from ids7 where k = 'w2')), 'sin módulos: queda uno solo, una vez');

-- Editar: cambiar repeticiones y mover un ejercicio de módulo
select public.save_workout(
  jsonb_build_object('id', (select v from ids7 where k = 'w'), 'player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Con módulos', 'is_template', true),
  jsonb_build_array(
    jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex1'), 'block', '0', 'block_repeats', '5'),
    jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex2'), 'block', '1', 'block_repeats', '2')));
select tests.ok((select count(*) = 2 from public.workout_items where template_id = (select v from ids7 where k = 'w') and not removed), 'editar deja los ejercicios nuevos y marca el sobrante');
select tests.ok((select block_repeats = 5 from public.workout_items where template_id = (select v from ids7 where k = 'w') and position = 0), 'editar cambia las repeticiones del módulo');

select tests.throws($$select public.save_workout(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Malo'), jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex1'), 'block_repeats', '0')))$$, '23514', 'un módulo no puede repetirse 0 veces');
select tests.throws($$select public.save_workout(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Malo'), jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex1'), 'block_repeats', '51')))$$, '23514', 'un módulo no puede repetirse más de 50 veces');
reset role;

select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.throws($$select public.save_workout(jsonb_build_object('player_id', '10000000-0000-0000-0000-000000000001', 'name', 'Mío'), jsonb_build_array(jsonb_build_object('exercise_id', (select v from ids7 where k = 'ex1'), 'block', '0', 'block_repeats', '2')))$$, '42501', 'el jugador sigue sin poder armar entrenamientos');
reset role;
