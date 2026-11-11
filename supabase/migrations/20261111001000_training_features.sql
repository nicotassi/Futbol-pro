-- =============================================================================
-- FUTBOLISTA PRO · 1000 · Fase 3: entrenamiento
-- =============================================================================
-- * save_workout(): guarda un entrenamiento y sus ejercicios en una sola
--   operación (atómica, respeta RLS: solo papá).
-- * finish_session(): registra una sesión realizada con sus resultados.
--   Idempotente por client_id → los reintentos sin conexión no duplican.
-- * Biblioteca inicial: cada jugador nuevo recibe 30 ejercicios base.
-- =============================================================================

-- El jugador puede corregir los resultados de sus propias sesiones
-- (finish_session los reemplaza al reintentar).
alter policy session_results_delete on public.session_results
  using (private.is_member(player_id));

-- -----------------------------------------------------------------------------
-- Guardar entrenamiento (plantilla o programado) con sus ejercicios
-- -----------------------------------------------------------------------------
create or replace function public.save_workout(p_workout jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_workout ->> 'id', '')::uuid;
  v_player uuid := (p_workout ->> 'player_id')::uuid;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El entrenamiento necesita al menos un ejercicio.' using errcode = '23514';
  end if;

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
    delete from public.workout_items where template_id = v_id;
  end if;

  insert into public.workout_items (template_id, player_id, exercise_id, position, sets, reps, duration_sec, rest_sec, instructions)
  select
    v_id,
    v_player,
    (item ->> 'exercise_id')::uuid,
    (ord - 1)::smallint,
    nullif(item ->> 'sets', '')::smallint,
    nullif(item ->> 'reps', '')::smallint,
    nullif(item ->> 'duration_sec', '')::integer,
    nullif(item ->> 'rest_sec', '')::integer,
    nullif(item ->> 'instructions', '')
  from jsonb_array_elements(p_items) with ordinality as t(item, ord);

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registrar una sesión realizada (idempotente por client_id)
-- -----------------------------------------------------------------------------
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
    (player_id, template_id, title, started_at, ended_at, status, actual_minutes, rpe, notes, post_state, client_id)
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
    (p_session ->> 'client_id')::uuid
  )
  on conflict (client_id) do update set
    title = excluded.title,
    ended_at = excluded.ended_at,
    status = excluded.status,
    actual_minutes = excluded.actual_minutes,
    rpe = excluded.rpe,
    notes = excluded.notes,
    post_state = excluded.post_state
  where s.player_id = excluded.player_id
  returning id into v_id;

  if v_id is null then
    raise exception 'Sesión no encontrada o sin permiso.' using errcode = '42501';
  end if;

  delete from public.session_results where session_id = v_id;

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

revoke all on function public.save_workout(jsonb, jsonb), public.finish_session(jsonb, jsonb) from public, anon;
grant execute on function public.save_workout(jsonb, jsonb), public.finish_session(jsonb, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Biblioteca inicial de ejercicios (adaptada a 9–13 años)
-- -----------------------------------------------------------------------------
create or replace function private.seed_default_exercises(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.exercises where player_id = p_player_id and is_custom = false) then
    return; -- ya cargada
  end if;

  insert into public.exercises
    (player_id, is_custom, category, name, objective, description, difficulty, est_minutes, materials, steps, common_mistakes, precautions, result_indicator)
  values
  -- Velocidad y explosividad --------------------------------------------------
  (p_player_id, false, 'speed', 'Aceleraciones 5-10-15 m', 'Mejorar la salida y los primeros pasos.',
   'Sprints cortos desde parado a tres distancias, con recuperación completa.', 1, 8,
   '{Conos}', '{"Marcá con conos 5, 10 y 15 metros.","Salí en posición de semiflexión, un pie adelante.","Corré a máxima velocidad hasta el cono indicado.","Volvé caminando y descansá 45 segundos."}',
   '{"Salir erguido","Pasos largos al inicio en vez de cortos y rápidos"}',
   'Hacelo después de entrar en calor. Pará si sentís dolor.', 'Mejor tiempo en 10 m (segundos)'),
  (p_player_id, false, 'speed', 'Frenadas y arranques', 'Controlar el cuerpo al cambiar de ritmo.',
   'Correr, frenar en dos tiempos y volver a arrancar.', 2, 8,
   '{Conos}', '{"Corré 8 metros a buena velocidad.","Frená con pasos cortos bajando la cadera.","Quedate quieto un segundo y volvé a arrancar."}',
   '{"Frenar con las piernas rectas","Inclinarse hacia atrás"}',
   'Superficie firme y antideslizante.', 'Frenadas controladas sin perder el equilibrio'),
  (p_player_id, false, 'speed', 'Reacción a la señal', 'Reaccionar rápido ante un estímulo.',
   'Salir corriendo cuando un adulto da una señal visual o sonora.', 1, 6,
   '{Conos}', '{"Ubicate en posición de salida.","Un adulto aplaude o levanta un color.","Salí lo más rápido posible 5 metros."}',
   '{"Adelantarse a la señal","Mirar al piso"}',
   'Descansá entre repeticiones.', 'Salidas a tiempo de 10 intentos'),
  (p_player_id, false, 'speed', 'Cambios de dirección en zigzag', 'Ganar agilidad para eludir rivales.',
   'Recorrido entre conos en zigzag a buena velocidad.', 2, 8,
   '{Conos}', '{"Poné 6 conos en zigzag separados 3 metros.","Recorrelos tocando cada cono con la mano.","Bajá la cadera en cada cambio."}',
   '{"Abrir mucho las curvas","Cruzar los pies"}',
   'Zapatillas o botines con buen agarre.', 'Tiempo del recorrido (segundos)'),
  (p_player_id, false, 'speed', 'Desplazamientos laterales', 'Mejorar la defensa y los cierres.',
   'Pasos laterales rápidos entre dos conos sin cruzar los pies.', 1, 6,
   '{Conos}', '{"Dos conos a 4 metros.","Desplazate de costado de cono a cono.","Mirá siempre al frente."}',
   '{"Cruzar los pies","Quedar con las piernas rectas"}',
   NULL, 'Toques de cono en 20 segundos'),
  -- Técnica individual --------------------------------------------------------
  (p_player_id, false, 'technique', 'Dominio de pelota', 'Mejorar el control y la sensibilidad con la pelota.',
   'Toques sin que la pelota caiga, alternando piernas.', 1, 8,
   '{Pelota}', '{"Soltá la pelota y tocala con el empeine.","Alterná pierna derecha e izquierda.","Contá tu mejor serie."}',
   '{"Patear muy fuerte","Usar siempre la misma pierna"}',
   NULL, 'Mejor serie de toques sin que caiga'),
  (p_player_id, false, 'technique', 'Conducción entre conos', 'Llevar la pelota cerca y con la cabeza levantada.',
   'Conducir en slalom usando interior y exterior de ambos pies.', 1, 8,
   '{Pelota,Conos}', '{"Poné 6 conos separados 1,5 metros.","Conducí en slalom con toques cortos.","Volvé usando la otra pierna."}',
   '{"Pelota muy lejos del pie","Mirar siempre la pelota"}',
   NULL, 'Tiempo ida y vuelta sin tocar conos'),
  (p_player_id, false, 'technique', 'Pase y control contra la pared', 'Precisión en el pase corto y buen primer toque.',
   'Pases con el interior contra una pared y control orientado.', 1, 10,
   '{Pelota,Pared}', '{"Parate a 3–4 metros de la pared.","Pasá con el interior del pie.","Controlá orientando hacia un costado y repetí.","Hacé series con cada pierna."}',
   '{"Pasar con la punta","Controlar con la pelota pegada al cuerpo"}',
   NULL, 'Pases seguidos sin error'),
  (p_player_id, false, 'technique', 'Control orientado', 'Recibir preparándose para la siguiente acción.',
   'Recibir un pase y con el primer toque llevar la pelota hacia un espacio libre.', 2, 10,
   '{Pelota,Conos}', '{"Un compañero o la pared te pasa la pelota.","Antes de recibir, mirá a dónde vas.","Con el primer toque llevá la pelota hacia el cono indicado."}',
   '{"Frenar la pelota en seco","No mirar antes de recibir"}',
   NULL, 'Controles orientados correctos de 10'),
  (p_player_id, false, 'technique', 'Pierna menos hábil', 'Ganar confianza con la pierna no dominante.',
   'Pases, conducción y remates usando solo la pierna menos hábil.', 2, 10,
   '{Pelota,Pared}', '{"Hacé 20 pases contra la pared solo con la pierna menos hábil.","Conducí 10 metros solo con esa pierna.","Terminá con 5 remates suaves."}',
   '{"Volver a la pierna hábil por costumbre","Pegarle sin apoyar bien el otro pie"}',
   NULL, 'Pases correctos con la pierna menos hábil'),
  -- Fuerza y estabilidad ------------------------------------------------------
  (p_player_id, false, 'strength', 'Sentadillas', 'Fortalecer piernas con el peso del cuerpo.',
   'Sentadillas lentas y controladas.', 1, 5,
   '{}', '{"Pies al ancho de hombros.","Bajá como si te sentaras en una silla.","Rodillas en línea con los pies.","Subí despacio."}',
   '{"Rodillas hacia adentro","Levantar los talones"}',
   'Sin peso extra. Calidad antes que cantidad.', 'Repeticiones bien hechas'),
  (p_player_id, false, 'strength', 'Plancha', 'Fortalecer el tronco (zona media).',
   'Sostener el cuerpo recto apoyado en antebrazos y puntas de pie.', 1, 4,
   '{Colchoneta}', '{"Apoyá antebrazos y puntas de pie.","Cuerpo recto de la cabeza a los talones.","Respirá normal y sostené."}',
   '{"Cadera muy alta o muy baja","Contener la respiración"}',
   'Pará si te duele la espalda.', 'Segundos sostenidos con buena postura'),
  (p_player_id, false, 'strength', 'Zancadas', 'Fuerza y equilibrio de piernas.',
   'Paso largo hacia adelante bajando la rodilla de atrás.', 1, 5,
   '{}', '{"Dá un paso largo hacia adelante.","Bajá hasta que ambas rodillas formen un ángulo recto.","Volvé y cambiá de pierna."}',
   '{"Rodilla de adelante pasando la punta del pie","Tronco inclinado"}',
   NULL, 'Repeticiones por pierna'),
  (p_player_id, false, 'strength', 'Flexiones adaptadas', 'Fuerza de brazos y tronco.',
   'Flexiones con rodillas apoyadas o en un banco.', 1, 4,
   '{}', '{"Manos al ancho de hombros.","Rodillas apoyadas si hace falta.","Bajá el pecho controlado y subí."}',
   '{"Cadera hundida","Codos muy abiertos"}',
   NULL, 'Repeticiones bien hechas'),
  (p_player_id, false, 'strength', 'Equilibrio en un pie', 'Estabilidad de tobillo y rodilla.',
   'Sostenerse en un pie con pequeños desafíos.', 1, 5,
   '{}', '{"Parate en un pie con la rodilla apenas flexionada.","Sostené 30 segundos.","Probá con ojos cerrados o pasando una pelota."}',
   '{"Rodilla trabada","Mirar al piso"}',
   'Cerca de una pared por seguridad.', 'Segundos sin apoyar el otro pie'),
  -- Resistencia ---------------------------------------------------------------
  (p_player_id, false, 'endurance', 'Carrera continua suave', 'Mejorar la resistencia aeróbica.',
   'Trotar a ritmo cómodo, pudiendo hablar mientras corrés.', 1, 12,
   '{}', '{"Trotá a un ritmo en el que puedas conversar.","Mantené el ritmo el tiempo indicado.","Terminá caminando 2 minutos."}',
   '{"Empezar muy rápido","Parar de golpe"}',
   'Hidratate antes y después.', 'Minutos trotando sin parar'),
  (p_player_id, false, 'endurance', 'Intervalos 30/30', 'Resistencia a esfuerzos repetidos como en el partido.',
   '30 segundos rápido y 30 segundos trotando suave.', 2, 10,
   '{Conos}', '{"Corré 30 segundos a ritmo alto (no máximo).","Trotá suave 30 segundos.","Repetí las series indicadas."}',
   '{"Ir al máximo y no poder terminar","Parar en la recuperación"}',
   'Si te mareás, pará y avisá a un adulto.', 'Series completas'),
  (p_player_id, false, 'endurance', 'Circuito con pelota', 'Resistencia jugando con la pelota.',
   'Recorrido que combina conducción, pase y carrera.', 2, 10,
   '{Pelota,Conos,Pared}', '{"Conducí 15 metros.","Pasá contra la pared 5 veces.","Volvé corriendo al inicio.","Repetí sin parar el tiempo indicado."}',
   '{"Bajar la calidad técnica por el cansancio"}',
   NULL, 'Vueltas completas'),
  (p_player_id, false, 'endurance', 'Juego de persecución', 'Resistencia de forma divertida.',
   'Juego de "mancha" con compañeros o familia en un espacio delimitado.', 1, 10,
   '{Conos}', '{"Marcá un espacio con conos.","Uno persigue y los demás escapan.","Cambien de rol cada minuto."}',
   '{"Salirse del espacio"}',
   'Espacio sin obstáculos.', 'Minutos jugando'),
  (p_player_id, false, 'endurance', 'Recuperación activa', 'Aprender a recuperarse entre esfuerzos.',
   'Caminata y trote muy suave con respiración controlada.', 1, 5,
   '{}', '{"Caminá 1 minuto respirando profundo.","Trotá muy suave 1 minuto.","Repetí."}',
   '{"Quedarse quieto de golpe"}',
   NULL, 'Sensación de recuperación (1 a 5)'),
  -- Coordinación y agilidad ---------------------------------------------------
  (p_player_id, false, 'coordination', 'Escalera de coordinación', 'Pies rápidos y coordinados.',
   'Distintos patrones de pasos en una escalera en el piso.', 1, 8,
   '{"Escalera o tiza"}', '{"Un pie en cada casillero.","Dos pies en cada casillero.","Desplazamiento lateral.","Entrar y salir (adentro-adentro-afuera-afuera)."}',
   '{"Mirar los pies todo el tiempo","Pisar los travesaños"}',
   NULL, 'Recorridos sin errores'),
  (p_player_id, false, 'coordination', 'Saltos coordinados', 'Coordinación y potencia de piernas.',
   'Saltos a uno y dos pies sobre líneas o conos bajos.', 2, 6,
   '{Conos}', '{"Saltá con dos pies hacia adelante y atrás.","Saltos laterales sobre una línea.","Saltos en un pie (pocas repeticiones)."}',
   '{"Caer con las piernas rectas","Hacer ruido fuerte al caer"}',
   'Caé suave, flexionando rodillas.', 'Saltos correctos por serie'),
  (p_player_id, false, 'coordination', 'Coordinación óculo-pédica', 'Coordinar lo que ves con lo que hacés con los pies.',
   'Tocar con la suela pelotas o conos que un adulto señala.', 1, 6,
   '{Pelota,Conos}', '{"Ubicá 4 conos de colores alrededor tuyo.","Un adulto dice un color.","Tocalo con el pie que corresponda y volvé al centro."}',
   '{"Adelantarse","Usar siempre el mismo pie"}',
   NULL, 'Aciertos de 10'),
  (p_player_id, false, 'coordination', 'Cambios de ritmo', 'Variar la velocidad con control.',
   'Conducción alternando lento y rápido a una señal.', 2, 6,
   '{Pelota}', '{"Conducí despacio.","A la señal, acelerá 5 metros.","Volvé a bajar el ritmo sin perder la pelota."}',
   '{"Perder la pelota al acelerar"}',
   NULL, 'Cambios sin perder la pelota'),
  (p_player_id, false, 'coordination', 'Reacción visual y auditiva', 'Reaccionar rápido a distintas señales.',
   'Moverse según la señal: un color o un sonido indican la dirección.', 1, 6,
   '{Conos}', '{"Rojo = izquierda, azul = derecha.","Un aplauso = salto.","Respondé lo más rápido posible."}',
   '{"Anticiparse sin la señal"}',
   NULL, 'Respuestas correctas de 10'),
  -- Inteligencia táctica ------------------------------------------------------
  (p_player_id, false, 'tactics', 'Escaneo antes de recibir', 'Mirar alrededor antes de que llegue la pelota.',
   'Antes de cada pase, girar la cabeza a ambos lados y decir qué ves.', 2, 8,
   '{Pelota,Pared}', '{"Pasá contra la pared.","Mientras vuelve la pelota, mirá a izquierda y derecha.","Un adulto muestra dedos: decí cuántos antes de controlar."}',
   '{"Mirar solo la pelota","Girar tarde la cabeza"}',
   NULL, 'Escaneos correctos de 10'),
  (p_player_id, false, 'tactics', 'Perfil corporal', 'Recibir con el cuerpo abierto hacia el juego.',
   'Recibir de costado, con el pie de atrás, mirando el arco o el campo.', 2, 8,
   '{Pelota,Conos}', '{"Ubicate de costado al pase.","Recibí con el pie más lejano.","Salí jugando hacia adelante."}',
   '{"Recibir de frente y quedar de espaldas al juego"}',
   NULL, 'Recepciones con buen perfil de 10'),
  (p_player_id, false, 'tactics', 'Toma de decisiones 2 opciones', 'Elegir rápido la mejor opción.',
   'Al recibir, un adulto indica un cono: pasar o conducir según el lado libre.', 2, 8,
   '{Pelota,Conos}', '{"Dos conos de salida a los costados.","Al recibir, el adulto tapa uno.","Elegí y jugá por el libre."}',
   '{"Decidir tarde","Ir siempre al mismo lado"}',
   NULL, 'Decisiones correctas de 10'),
  (p_player_id, false, 'tactics', 'Desmarque y ofrecimiento', 'Moverse para recibir libre de marca.',
   'Moverse a un espacio libre para ofrecer una línea de pase.', 2, 8,
   '{Pelota,Conos}', '{"Un adulto con la pelota y un cono como defensor.","Movete para que el cono no tape la línea de pase.","Pedí la pelota con la mano y la voz."}',
   '{"Quedarse quieto detrás del defensor"}',
   NULL, 'Veces que quedaste libre para recibir'),
  (p_player_id, false, 'tactics', 'Ocupación de espacios del mediocampista', 'Entender dónde ubicarse en el campo.',
   'Ejercicio con conos que representan compañeros y rivales para elegir la mejor ubicación.', 2, 10,
   '{Conos}', '{"Armá con conos una situación de juego.","Ubicate entre líneas, donde puedas recibir.","Explicá por qué elegiste ese lugar."}',
   '{"Ubicarse en la misma línea que un compañero"}',
   NULL, 'Ubicaciones correctas');
end;
$$;
revoke all on function private.seed_default_exercises(uuid) from public, anon, authenticated;

create or replace function private.seed_exercises_for_new_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_default_exercises(new.id);
  return new;
end;
$$;

create trigger players_seed_exercises
  after insert on public.players
  for each row execute function private.seed_exercises_for_new_player();

-- Jugadores que ya existían.
select private.seed_default_exercises(id) from public.players;
