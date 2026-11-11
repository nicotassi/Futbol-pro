-- Fase 5: revisión de métricas del reloj.
select set_config('request.jwt.claim.sub', '', false);
create temp table ids5 (k text primary key, v uuid);
grant select, insert, update on ids5 to authenticated;

-- Fixture: una sesión y dos métricas extraídas pendientes (las crea el servidor)
insert into public.workout_sessions (player_id, title, started_at, client_id)
values ('10000000-0000-0000-0000-000000000001', 'Sesión con reloj', now(), gen_random_uuid());
insert into ids5 select 's', id from public.workout_sessions where title = 'Sesión con reloj';
insert into public.watch_uploads (id, player_id, workout_session_id, image_path, image_sha256, processing_status)
select gen_random_uuid(), '10000000-0000-0000-0000-000000000001', v, 'p5/a.jpg', repeat('e', 64), 'done' from ids5 where k = 's';
insert into ids5 select 'u', id from public.watch_uploads where image_path = 'p5/a.jpg';
insert into public.watch_metrics (upload_id, player_id, workout_session_id, metric_type, metric_value, metric_unit, confidence)
select (select v from ids5 where k = 'u'), '10000000-0000-0000-0000-000000000001', (select v from ids5 where k = 's'), 'heart_rate_avg', '142', 'bpm', 0.9;
insert into public.watch_metrics (upload_id, player_id, workout_session_id, metric_type, metric_value, metric_unit, confidence)
select (select v from ids5 where k = 'u'), '10000000-0000-0000-0000-000000000001', (select v from ids5 where k = 's'), 'heart_rate_avg', '145', 'bpm', 0.4;
insert into ids5 select 'm1', id from public.watch_metrics where metric_value = '142';
insert into ids5 select 'm2', id from public.watch_metrics where metric_value = '145';

-- BENJA no puede revisar ni cargar
select tests.login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tests.throws($$select public.review_watch_metric((select v from ids5 where k = 'm1'), 'confirm')$$, '42501', 'el jugador no puede confirmar datos del reloj');
select tests.throws($$select public.add_watch_metric('10000000-0000-0000-0000-000000000001', (select v from ids5 where k = 's'), 'calories', '300')$$, '42501', 'el jugador no puede cargar datos del reloj');
select tests.ok((select count(*) = 0 from public.confirmed_watch_metrics where workout_session_id = (select v from ids5 where k = 's')), 'lo pendiente no entra a las estadísticas oficiales');
reset role;

-- PAPÁ revisa
select tests.login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select public.review_watch_metric((select v from ids5 where k = 'm1'), 'confirm');
select tests.ok((select validation_status = 'confirmed' and confirmed_value = '142' from public.watch_metrics where id = (select v from ids5 where k = 'm1')), 'papá confirma un dato');
select tests.ok((select count(*) = 1 from public.confirmed_watch_metrics where workout_session_id = (select v from ids5 where k = 's') and metric_type = 'heart_rate_avg'), 'el dato confirmado entra a las estadísticas');
select public.review_watch_metric((select v from ids5 where k = 'm2'), 'correct', '144');
select tests.ok((select validation_status = 'corrected' and confirmed_value = '144' and metric_value = '145' from public.watch_metrics where id = (select v from ids5 where k = 'm2')), 'corregir conserva el valor original');
select tests.ok((select validation_status = 'rejected' from public.watch_metrics where id = (select v from ids5 where k = 'm1')), 'el valor oficial anterior queda descartado (no se borra)');
select tests.ok((select count(*) = 1 and min(value) = '144' from public.confirmed_watch_metrics where workout_session_id = (select v from ids5 where k = 's') and metric_type = 'heart_rate_avg'), 'hay un solo valor oficial por sesión y métrica');
select tests.throws($$select public.review_watch_metric((select v from ids5 where k = 'm2'), 'correct', '  ')$$, '23514', 'no se acepta un valor vacío');
select tests.throws($$select public.review_watch_metric((select v from ids5 where k = 'm2'), 'borrar')$$, '22023', 'acción inválida');
select public.review_watch_metric((select v from ids5 where k = 'm2'), 'reject');
select tests.ok((select count(*) = 0 from public.confirmed_watch_metrics where workout_session_id = (select v from ids5 where k = 's') and metric_type = 'heart_rate_avg'), 'descartar quita el dato de las estadísticas');
insert into ids5 values ('man', public.add_watch_metric('10000000-0000-0000-0000-000000000001', (select v from ids5 where k = 's'), 'calories', '310', 'kcal'));
select tests.ok((select validation_status = 'confirmed' and upload_id is null and source = 'Manual' from public.watch_metrics where id = (select v from ids5 where k = 'man')), 'papá carga un dato a mano ya confirmado');
select public.add_watch_metric('10000000-0000-0000-0000-000000000001', (select v from ids5 where k = 's'), 'calories', '320', 'kcal');
select tests.ok((select count(*) = 1 and min(value) = '320' from public.confirmed_watch_metrics where workout_session_id = (select v from ids5 where k = 's') and metric_type = 'calories'), 'cargar otra vez reemplaza el valor oficial sin duplicar');
reset role;

-- Otra familia no ve nada
select tests.login('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select tests.ok((select count(*) = 0 from public.watch_metrics where workout_session_id = (select v from ids5 where k = 's')), 'otra familia no ve las métricas');
select tests.throws($$select public.review_watch_metric((select v from ids5 where k = 'm1'), 'confirm')$$, '42501', 'otra familia no puede revisar datos ajenos');
reset role;
