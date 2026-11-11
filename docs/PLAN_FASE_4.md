# FASE 4 — Partidos, bienestar, objetivos y evaluaciones

> Estado: **implementada**. Migración `1100` aplicada en Supabase.

## Qué se construyó

### Partidos (`/partidos`)

- **Registrar y editar** un partido: fecha, rival, competencia, resultado, minutos, titular/suplente y posición.
- **11 estadísticas** opcionales (goles, asistencias, pases buenos/errados, recuperaciones, intercepciones, tiros, tiros al arco, duelos ganados, pérdidas, faltas). **Lo que no se carga queda "sin registrar": nunca se asume cero.**
- **Evaluación personal** (escalas 1–5: físico, concentración, decisiones, ofrecerse, ayudar a recuperar, partido en general) y textos "qué hice bien / qué quiero mejorar".
- **Mi mejor jugada**: qué pasó, qué decisión tomé, qué salió bien, qué haría distinto (texto).
- **Resumen de temporada**: partidos, goles, asistencias, minutos, precisión de pases y promedio de autoevaluación. Solo suma lo registrado.
- Funciona **sin conexión**: el partido queda en el celular ("Pendiente") y se envía solo.
- **Quitar** un partido lo marca (`removed = true`); no se borra.

### Bienestar y semáforo (`/recuperacion`)

- **Un registro por día** (guardar otra vez el mismo día lo actualiza): horas y calidad de sueño, energía, cansancio muscular, ganas de entrenar, estado general, hidratación, dolor (0–3), "me siento enfermo", molestias y notas.
- **Semáforo** calculado por la base de datos (no se puede falsear desde la app) y mostrado en vivo mientras se completa el formulario:
  - 🔴 Rojo: enfermo, dolor moderado/fuerte o estado general mínimo → aviso "avisá a un adulto antes de entrenar".
  - 🟡 Amarillo: dolor leve, molestia anotada, menos de 8 h de sueño, sueño/energía/ganas/estado/hidratación bajos o mucho cansancio muscular.
  - 🟢 Verde: el resto. Sin ningún dato → sin semáforo.
- La misma regla está en SQL (`private.wellness_light`) y en TypeScript (`traffic.ts`), con los mismos casos en ambas pruebas.
- Funciona sin conexión.

### Objetivos y evaluaciones (`/objetivos`)

- **Objetivos**: papá los crea (aprobados); Benja los **propone** y papá los **aprueba**. Benja puede marcar el progreso (0–100 %) de lo que propuso mientras no esté aprobado; papá administra todos. El estado (pendiente / en curso / completado) sale del progreso.
- **Evaluaciones físicas** (control, pase, velocidad, resistencia, coordinación, visión de juego): las carga **solo papá** (prueba, resultado, unidad, puntaje 1–10); ambos las ven, con la última por capacidad y su variación.
- Quitar un objetivo o una evaluación los marca como `removed`.

### Inicio

Partidos de la semana, objetivos activos con su progreso y el último semáforo ahora salen de datos reales.

## Decisiones técnicas

- **Nada se borra**: igual que en la Fase 3, quitar = `removed = true` (Supabase pide aprobación manual para DELETE). Las pantallas ignoran lo marcado.
- **`save_match` y `save_wellness`** son idempotentes (por `client_id` / por día), así la cola sin conexión puede reintentar sin duplicar. La cola ahora maneja tres tipos de registro (sesiones, partidos, bienestar).
- **Permisos** (RLS, ya definidos en la Fase 2 y verificados de nuevo): el jugador registra partidos y bienestar; propone objetivos pero no los aprueba; solo papá carga evaluaciones; otra familia no ve nada.

## Pendiente / límites conocidos

- "Mi mejor jugada" guarda **texto**; la foto o el video (bucket `match-media`) quedan para una fase posterior.
- Los puntos y logros se habilitan en la Fase 6.

## Verificación

| Prueba                                                                                                                            | Resultado |
| --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Base de datos: 159 verificaciones (56 nuevas: semáforo, partidos, bienestar, objetivos, evaluaciones, aislamiento entre familias) | ✅        |
| Tests unitarios (semáforo, formulario de partido, resumen, objetivos, cola)                                                       | ✅        |
| Tests e2e de Fase 4 (Android y escritorio)                                                                                        | ✅        |
| Migración aplicada en Supabase                                                                                                    | ✅        |
