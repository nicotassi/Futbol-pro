# FASE 3 — Entrenamiento

> Estado: **implementada y publicada**.

## Qué se construyó

### Biblioteca de ejercicios

- **30 ejercicios base**, 5 por categoría y adaptados a 9–13 años. Cada familia los recibe automáticamente al crear su cuenta.
- **Ficha completa** de cada ejercicio:
  - objetivo, descripción, dificultad y duración;
  - paso a paso y materiales;
  - errores frecuentes y precauciones;
  - cómo medir el resultado;
  - enlace a un video.
- **Búsqueda y filtros** por categoría y por **favoritos**. Cada usuario tiene sus propios favoritos.
- **Ejercicios propios:** papá los puede crear, editar y eliminar. Si un ejercicio está en un entrenamiento, se avisa antes de borrarlo.

### Constructor de entrenamientos (papá)

- Elegir ejercicios de la biblioteca, ordenarlos y quitarlos.
- Para cada ejercicio: series, repeticiones, duración, descanso e indicaciones.
- Guardarlo como **plantilla** o como entrenamiento **con fecha**, con un objetivo y una duración total (la app sugiere una).
- **Editar, duplicar y eliminar** entrenamientos.
- El guardado es **atómico** (`save_workout`): se guarda todo o nada.

### Modo entrenamiento

- **Un ejercicio por pantalla**, con:
  - cuenta regresiva o cronómetro;
  - series con descanso automático, vibración al terminar y opción de saltar el descanso;
  - pasos del ejercicio;
  - botones de anterior, siguiente y pausa.
- **El progreso se guarda en el celular en cada toque.** Si se cierra la app, Entrenar muestra "Entrenamiento sin terminar → Continuar".
- **Al terminar** se registran:
  - la duración real (se propone la transcurrida);
  - los ejercicios completados e incompletos;
  - el esfuerzo percibido (1–10);
  - cómo terminó (1–5);
  - las observaciones.

### Registro e historial

- **Entrenamiento libre** para lo que no salió de una plantilla (club, plaza): nombre, fecha, minutos, esfuerzo y estado.
- **Historial** con el detalle de cada sesión y el resultado por ejercicio.
- **Inicio con datos reales:** minutos y sesiones de la semana, último entrenamiento y próximo programado.

### Sin conexión

- **Cola en IndexedDB:** las sesiones se guardan primero en el celular y se envían solas al volver internet (también al abrir la app y cada minuto).
- **Sin duplicados:** `finish_session` es idempotente por `client_id`, así que un reenvío no duplica.
- **Siempre visible:** un aviso muestra los registros pendientes, y el historial los marca como "Pendiente".

## Decisión técnica: nada se borra al editar

Supabase pide aprobación manual para las operaciones que borran filas, y esa aprobación no le llega al usuario en su dispositivo. Por eso:

- **Al editar un entrenamiento**, los ejercicios que sobran se marcan con `removed = true` y no se borran.
- **Al reenviar una sesión**, los resultados anteriores quedan marcados del mismo modo.
- **La app ignora las filas marcadas.** Además se conserva el historial.

## Verificación

| Prueba                                                                                                      | Resultado |
| ----------------------------------------------------------------------------------------------------------- | --------- |
| Base de datos: 103 verificaciones (RLS, `save_workout`, `finish_session`, idempotencia, biblioteca inicial) | ✅        |
| 50 tests unitarios (cola sin conexión, lógica del modo entrenamiento, validaciones)                         | ✅        |
| Tests e2e: 58 (29 escenarios × Android y escritorio)                                                        | ✅        |
| Migración aplicada en Supabase                                                                              | ✅        |

## Pendiente

Lo que quedaba (partidos, bienestar, objetivos y evaluaciones) se hizo en la [Fase 4](PLAN_FASE_4.md).
