# FASE 2 — Base de datos y usuarios

> Estado: **implementada**. Pendiente de validación del usuario: falta conectar el proyecto real de Supabase (pasos en el README).

**Objetivo:** usuarios con permisos diferenciados y datos persistentes y protegidos.

## Qué se construyó

### Base de datos (`supabase/migrations/`)

| Migración            | Contenido                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0100_base`          | Esquema `private` (no expuesto por la API), tipos enumerados y trigger de `updated_at`.                                                                            |
| `0200_users_players` | `profiles`, `players` y `player_access`. Funciones de permisos `is_member`, `is_admin` y `shares_player`. Perfil creado automáticamente al dar de alta un usuario. |
| `0300_training`      | `exercises`, `exercise_favorites`, `workout_templates`, `workout_items`, `workout_sessions` y `session_results`.                                                   |
| `0400_performance`   | `matches`, `match_statistics`, `match_reflections`, `wellness_logs`, `goals`, `assessments`, `calendar_events`, `achievements` y `xp_events`.                      |
| `0500_watch`         | `watch_uploads` y `watch_metrics`, más la vista `confirmed_watch_metrics`.                                                                                         |
| `0600_security`      | Privilegios, RLS en todas las tablas, matriz de permisos, autor del registro forzado y sellado de la revisión de métricas.                                         |
| `0700_storage`       | Buckets privados `watch-screenshots` y `player-media`, con políticas por carpeta del jugador.                                                                      |

Las tablas de todas las fases quedan creadas desde ahora. Así el modelo de datos y la seguridad se validan una sola vez, y las fases siguientes solo agregan pantallas.

**Matriz de permisos**

| Datos                                                    | Benja (jugador)              | Papá (admin)                   |
| -------------------------------------------------------- | ---------------------------- | ------------------------------ |
| Perfil del jugador                                       | ver                          | ver y editar                   |
| Ejercicios, plantillas, evaluaciones, calendario         | ver                          | todo                           |
| Sesiones, partidos, estadísticas, reflexiones, bienestar | ver, crear y editar          | todo                           |
| Objetivos                                                | ver y proponer (sin aprobar) | todo, incluido aprobar         |
| Capturas y métricas del reloj                            | ver                          | todo                           |
| Logros y XP                                              | ver                          | ver (los otorga el servidor)   |
| Vínculos de acceso                                       | ver el propio                | ver todos (los crea el script) |
| Otra familia o usuario anónimo                           | nada                         | nada                           |

**Integridad**

- **Datos de jugadores separados.** Las FK compuestas `(id, player_id)` impiden mezclar datos de jugadores distintos.
- **Reintentos sin duplicados.**
  - `client_id` es único, así que un reintento sin conexión no duplica registros.
  - La misma captura no se registra dos veces en una sesión.
  - Hay a lo sumo una métrica validada por sesión y tipo.
- **Reglas sobre los valores.**
  - Las escalas tienen rangos acotados.
  - Las estadísticas no registradas quedan en `NULL` (no se asume cero).
- **Revisión del reloj.**
  - El valor original extraído por la IA no se puede reescribir.
  - Quién confirmó y cuándo lo completa el servidor.
- **Autoría.** El autor (`created_by`) es siempre el usuario actual y no se puede cambiar.

### Autenticación

- **Papá** ingresa con email. **Benja** ingresa con un usuario (`benja`), que internamente se traduce a `benja@jugador.futbolista-pro.app`.
- **Registro público deshabilitado.** Las cuentas se crean con `npm run family -- setup` usando la clave secreta. Esa clave solo vive en `.env.server.local`.
- **Roles.** Salen de `player_access`, que el usuario no puede modificar, y nunca de metadatos editables.

### Frontend

- Cliente de Supabase con clave pública. Si falta la configuración, se muestra una pantalla de "Falta conectar la base de datos" en lugar de simular un backend.
- `AuthProvider`/`useAuth`: sesión, perfil, jugador activo y rol. Los guards `RequireAuth` y `RequireAdmin` protegen las rutas.
- Pantalla de ingreso con validación y mensajes de error en español.
- Dashboard y Perfil con datos reales del jugador, con la edad calculada.
- Papá edita el perfil del jugador con validación zod, que coincide con los CHECK de la base.
- Administración muestra los usuarios con acceso.
- Benja no ve las secciones de papá. Igual, la protección real está en la base.
- **Sin conexión.** TanStack Query persiste la caché en IndexedDB: la app abre sin internet con los últimos datos. Al cerrar sesión se borran la caché y la sesión del dispositivo.

## Verificación

| Prueba                                                                                            | Resultado |
| ------------------------------------------------------------------------------------------------- | --------- |
| `npm run db:test`: migraciones reales sobre PostgreSQL 16 + 70 verificaciones de RLS e integridad | ✅        |
| `npm test`: 25 tests unitarios                                                                    | ✅        |
| `npm run test:e2e`: 42 tests (21 escenarios × Pixel 7 y escritorio)                               | ✅        |
| `npm run typecheck` y `npm run lint`                                                              | ✅        |

**Limitaciones de este entorno (dicho con transparencia):**

- **No se pudo levantar Supabase completo.** El registro de imágenes de Docker estaba bloqueado. Por eso:
  - Las migraciones y las políticas se probaron en PostgreSQL 16, con una réplica mínima de los esquemas de Supabase (`supabase/tests/00_supabase_shim.sql`).
  - En Supabase real corren sobre PostgreSQL 17; no se espera ninguna diferencia.
- **La interfaz se probó contra una simulación de Supabase Auth y REST** (`tests/e2e/support/mockSupabase.ts`) que replica las mismas reglas de permisos.
- **Falta una prueba con el proyecto real.** La primera vez que se conecte hay que ejecutar la lista de verificación del README.

## Decisiones de la fase

- **Tablas de todas las fases ya creadas:** evita migraciones que rompan datos más adelante.
- **Cola de sincronización sin conexión:** se implementa en la Fase 3, junto con su primer uso real, que es guardar sesiones. Hoy no hay escrituras que encolar, porque editar el perfil exige conexión a propósito. El esquema ya está preparado con `client_id`.
- **Tipos de TypeScript:** `src/types/database.ts` cubre por ahora las tablas que usa la app. Con el proyecto vinculado se regenera completo con `npm run db:types`.

## Pendiente (Fase 3)

- Catálogo inicial de ejercicios para la biblioteca, con alta, edición y baja hechas por papá.
- Constructor de entrenamientos, plantillas y modo entrenamiento con registro real.
- Cola de sincronización sin conexión (IndexedDB) para sesiones.
