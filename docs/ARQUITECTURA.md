# FUTBOLISTA PRO — Arquitectura técnica

> Estado: **aprobada**. Decisiones abiertas resueltas (ver sección 14). Fase 1 implementada.
> Documento de referencia: especificación funcional "Documento maestro v1.0".

---

## 1. Análisis del entorno

| Ítem                       | Resultado                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Repositorio                | `nicotassi/Futbol-pro`, **vacío** (sin commits previos). No hay trabajo existente que preservar. |
| Node.js / npm              | Node 22 LTS, npm 10, pnpm disponible.                                                            |
| Docker                     | Disponible (permite levantar Supabase local con la CLI en la Fase 2).                            |
| Supabase / proveedor de IA | Sin configurar todavía. No hay claves ni proyecto creado.                                        |

Conclusión: se parte de cero; no hay riesgo de sobrescribir nada.

---

## 2. Visión general

```
┌──────────────────────────── Celular Android (PWA instalada) ────────────────────────────┐
│  React + TypeScript (Vite)                                                               │
│  ├─ UI (componentes + páginas por módulo)                                                │
│  ├─ TanStack Query  ── caché de lectura (persistida en IndexedDB)                         │
│  ├─ Cola de sincronización (IndexedDB) ── escrituras pendientes sin conexión             │
│  └─ Service Worker (Workbox) ── app shell offline, íconos, fuentes                        │
└───────────────┬──────────────────────────────────────────────────────────────────────────┘
                │ HTTPS (supabase-js con JWT del usuario)
┌───────────────▼──────────────────────────── Supabase ───────────────────────────────────┐
│  Auth ── cuentas de papá (admin) y Benja (jugador)                                       │
│  PostgreSQL + RLS ── todas las tablas; permisos por rol                                  │
│  Storage (buckets PRIVADOS) ── capturas del reloj, fotos/videos de jugadas               │
│  Edge Function `watch-analyze` ── única pieza que conoce la clave de IA                  │
└───────────────┬──────────────────────────────────────────────────────────────────────────┘
                │ HTTPS (clave en secreto del servidor, nunca en el frontend)
         ┌──────▼──────┐
         │ Claude API  │  visión → JSON estructurado con métricas visibles + confianza
         └─────────────┘
```

Principios:

1. **La base de datos es la fuente de verdad.** IndexedDB solo es caché y cola de pendientes.
2. **Seguridad en el servidor.** Los permisos se garantizan con RLS, no con ocultar botones.
3. **IA aislada.** El análisis de imágenes vive en una Edge Function separada de la lógica de entrenamiento.
4. **Nada automático sin revisión humana** en los datos del reloj.
5. **Preparado para crecer** (más de un jugador, entrenador IA, pizarra táctica) sin construirlo ahora.

---

## 3. Stack y dependencias

Se eligen opciones estables, populares y con buena documentación. Las versiones exactas se fijan en `package.json` al crear el proyecto (última estable de cada una).

### 3.1 Frontend (Fase 1)

| Necesidad            | Elección                                                               | Motivo                                                                                        |
| -------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Framework            | **React 19 + TypeScript** (modo `strict`)                              | Pedido por la especificación.                                                                 |
| Build / dev          | **Vite**                                                               | Rápido, estándar, buen soporte PWA.                                                           |
| Ruteo                | **React Router** (modo librería)                                       | Simple, rutas anidadas para el layout con navegación inferior.                                |
| Estilos              | **Tailwind CSS v4** + tokens de diseño en variables CSS                | Consistencia visual, sin CSS muerto; los tokens centralizan la paleta (dorado, carbón, etc.). |
| Íconos               | **lucide-react** + SVG propios para íconos deportivos                  | Línea fina, moderna, tree-shakeable.                                                          |
| Tipografía           | **Outfit** (títulos, geométrica) + **Inter** (texto) vía `@fontsource` | Autoalojadas: funcionan offline y sin pedir a Google Fonts.                                   |
| PWA                  | **vite-plugin-pwa** (Workbox)                                          | Manifest, service worker, instalación en Android.                                             |
| Fechas               | **date-fns** con locale `es`                                           | Liviano, inmutable.                                                                           |
| Utilidades de clases | `clsx`                                                                 | Composición de clases condicionales.                                                          |

### 3.2 Frontend (se agregan en fases posteriores, no en la Fase 1)

| Fase | Dependencia                                                        | Uso                                                              |
| ---- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 2    | `@supabase/supabase-js`                                            | Auth, base de datos, storage.                                    |
| 2    | `@tanstack/react-query` + persistencia en IndexedDB (`idb-keyval`) | Estado de servidor, caché offline.                               |
| 2–3  | `react-hook-form` + `zod`                                          | Formularios y validación (los esquemas Zod también tipan datos). |
| 3    | `@dnd-kit/sortable`                                                | Reordenar ejercicios en el constructor.                          |
| 6    | `recharts`                                                         | Gráficos de líneas, barras y radar.                              |

### 3.3 Calidad

| Herramienta              | Uso                                                         |
| ------------------------ | ----------------------------------------------------------- |
| ESLint + Prettier        | Estilo y errores comunes.                                   |
| Vitest + Testing Library | Tests unitarios y de componentes.                           |
| Playwright               | Pruebas end-to-end en viewport de Android (p. ej. Pixel 7). |
| `tsc --noEmit`           | Verificación de tipos en CI.                                |

### 3.4 Backend

| Componente    | Elección                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Base de datos | Supabase PostgreSQL, migraciones SQL versionadas en `supabase/migrations/` (Supabase CLI).                                           |
| Autenticación | Supabase Auth (email + contraseña).                                                                                                  |
| Archivos      | Supabase Storage, buckets privados con políticas por rol y URLs firmadas de corta duración.                                          |
| Funciones     | Supabase Edge Functions (Deno + TypeScript).                                                                                         |
| IA de visión  | Claude API mediante el SDK oficial `@anthropic-ai/sdk`, modelo configurable por variable de entorno (por defecto `claude-opus-5-5`). |

### 3.5 Hosting del frontend

Recomendación: **Vercel** o **Cloudflare Pages** (plan gratuito, HTTPS automático, requisito para PWA). Se decide en la Fase 7; durante el desarrollo alcanza con `vite dev` / `vite preview`.

---

## 4. Estructura de carpetas

```
futbol-pro/
├─ docs/                       # Arquitectura, planes por fase, decisiones
├─ public/
│  ├─ icons/                   # Íconos PWA (192, 512, maskable), favicon
│  └─ images/                  # Ilustraciones de ejercicios (estáticas)
├─ src/
│  ├─ app/                     # Arranque: App.tsx, router, providers
│  ├─ components/
│  │  ├─ ui/                   # Primitivas: Button, Card, Badge, Input, Sheet, Skeleton…
│  │  ├─ layout/               # AppShell, BottomNav, TopBar, PageHeader
│  │  └─ feedback/             # EmptyState, ErrorState, LoadingState, ErrorBoundary
│  ├─ pages/
│  │  ├─ Dashboard/
│  │  ├─ Training/             # Constructor + modo entrenamiento
│  │  ├─ Exercises/            # Biblioteca
│  │  ├─ Matches/
│  │  ├─ Evolution/
│  │  ├─ Recovery/
│  │  ├─ Goals/
│  │  ├─ Calendar/
│  │  ├─ Profile/
│  │  ├─ Administration/
│  │  └─ WatchUpload/
│  ├─ features/                # (Fase 2+) lógica por dominio: hooks + servicios de cada módulo
│  ├─ services/                # Cliente Supabase, cola de sincronización, API de IA
│  ├─ hooks/                   # Hooks genéricos (useOnlineStatus, useMediaQuery…)
│  ├─ contexts/                # AuthContext, etc.
│  ├─ types/                   # Tipos de dominio + tipos generados de la BD
│  ├─ utils/                   # Formateo de fechas, números, validaciones
│  └─ styles/                  # tokens.css, globals.css
├─ supabase/
│  ├─ migrations/              # SQL versionado (tablas, índices, RLS)
│  ├─ functions/
│  │  └─ watch-analyze/        # Edge Function de análisis de capturas
│  └─ seed.sql                 # Solo catálogo inicial de ejercicios (no datos de Benja)
├─ tests/e2e/                  # Playwright
├─ .env.example
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

Ajustes respecto de la propuesta original y por qué:

- `src/app/` agrupa el arranque para que `pages/` contenga solo pantallas.
- `components/` se divide en `ui`, `layout` y `feedback` para evitar una carpeta plana gigante.
- `pages/Profile/` se agrega porque Perfil es una de las cinco pestañas.
- `features/` (desde la Fase 2) evita que `services/` mezcle todos los dominios.

---

## 5. Identidad visual (tokens)

| Token                 | Valor inicial                                       | Uso                                                         |
| --------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| `--color-bg`          | `#FAF8F4` (blanco cálido)                           | Fondo principal.                                            |
| `--color-surface`     | `#FFFFFF`                                           | Tarjetas.                                                   |
| `--color-ink`         | `#16171A` (negro carbón)                            | Texto principal, secciones destacadas.                      |
| `--color-ink-soft`    | `#22242A`                                           | Fondos oscuros alternativos.                                |
| `--color-gold`        | `#C9A44C`                                           | Acento: logros, datos clave, estado activo.                 |
| `--color-gold-strong` | `#A9852F`                                           | Dorado sobre fondo claro (contraste suficiente para texto). |
| `--color-muted`       | `#6B6E76`                                           | Texto secundario.                                           |
| `--color-line`        | `#E6E2DA`                                           | Bordes sutiles y divisiones.                                |
| Semáforo              | verde `#2F9E6B`, amarillo `#E0A526`, rojo `#D2453B` | Solo en recuperación / estados.                             |

- Radio de tarjetas 16 px, bordes de 1 px, sombras mínimas.
- Escala tipográfica fluida; tamaño base 16 px; objetivos táctiles ≥ 44 px.
- Animaciones: transiciones CSS de 150–250 ms, respetando `prefers-reduced-motion`.
- El dorado se limita a acentos (regla práctica: ≤ 10 % de la pantalla).
- Contraste AA verificado para todas las combinaciones de texto.

---

## 6. Navegación

Navegación inferior fija con 5 pestañas: **Inicio · Entrenar · Objetivos · Evolución · Perfil**.

| Ruta                   | Pantalla                                                   | Acceso                             |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------- |
| `/`                    | Dashboard                                                  | Pestaña Inicio                     |
| `/entrenar`            | Hub de entrenamiento (sesiones, plantillas)                | Pestaña Entrenar                   |
| `/entrenar/ejercicios` | Biblioteca                                                 | Desde Entrenar                     |
| `/entrenar/sesion/:id` | Modo entrenamiento (pantalla completa, sin barra inferior) | Desde Entrenar                     |
| `/objetivos`           | Objetivos y logros                                         | Pestaña Objetivos                  |
| `/evolucion`           | Estadísticas y gráficos                                    | Pestaña Evolución                  |
| `/perfil`              | Perfil del jugador, ajustes, cerrar sesión                 | Pestaña Perfil                     |
| `/partidos`            | Partidos                                                   | Desde Inicio (acceso rápido)       |
| `/recuperacion`        | Bienestar y semáforo                                       | Desde Inicio                       |
| `/calendario`          | Calendario                                                 | Desde Inicio                       |
| `/reloj`               | Registro del reloj                                         | Desde Inicio / sesión (solo admin) |
| `/admin`               | Administración                                             | Desde Perfil (solo admin)          |

En tablet/escritorio (≥ 1024 px) la barra inferior se convierte en barra lateral; el contenido se centra con ancho máximo.

---

## 7. Usuarios, roles y seguridad

- Tabla `profiles` (1:1 con `auth.users`) con `role ∈ {admin, player}`.
- Tabla `player_profiles` con los datos deportivos. Todas las tablas de datos tienen `player_id`, lo que deja la puerta abierta a más de un jugador sin rediseñar.
- Tabla `player_access (user_id, player_id, role)` define quién ve a qué jugador. Las políticas RLS usan funciones `SECURITY DEFINER` como `can_read_player(player_id)` y `is_player_admin(player_id)`.
- Regla general de permisos:
  - **Lectura**: admin y jugador de ese `player_id`.
  - **Escritura**: el jugador puede crear sesiones, partidos, bienestar, objetivos (propuestos) y observaciones; solo el admin edita/elimina ejercicios, plantillas, evaluaciones, confirma métricas del reloj y exporta.
  - `watch_uploads` y `watch_metrics`: solo admin escribe; la confirmación (`confirmed_value`, `validation_status`) solo admin.
- Storage: buckets `watch-screenshots` y `match-media` **privados**; ruta `player_id/...`; acceso por URL firmada.
- Registro público deshabilitado en Supabase Auth: las cuentas se crean manualmente.
- Las capturas pueden tener datos personales: no se envían a la IA más que la imagen; no se guardan logs con su contenido.

---

## 8. Modelo de datos (borrador para la Fase 2)

Todas las tablas: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`, `player_id` (FK) cuando corresponde, índices por `(player_id, fecha)`.

| Tabla                        | Campos principales                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                   | user_id, display_name, role                                                                                                                                                                          |
| `player_profiles`            | name, birth_year, position, dominant_foot, club, avatar_path                                                                                                                                         |
| `player_access`              | user_id, player_id, role                                                                                                                                                                             |
| `exercises`                  | name, category (enum de 6), objective, description, difficulty (1–3), est_minutes, materials[], steps[], common_mistakes[], precautions, result_indicator, media_path, is_custom, created_by         |
| `exercise_favorites`         | user_id, exercise_id                                                                                                                                                                                 |
| `workout_templates`          | name, objective, est_minutes, is_template, scheduled_for, notes                                                                                                                                      |
| `workout_items`              | template_id, exercise_id, position, sets, reps, duration_sec, rest_sec, instructions                                                                                                                 |
| `workout_sessions`           | template_id?, started_at, ended_at, status (in_progress / completed / abandoned), actual_minutes, rpe (1–10), notes, post_state, client_id (idempotencia)                                            |
| `session_results`            | session_id, workout_item_id, completed, sets_done, reps_done, value, unit                                                                                                                            |
| `matches`                    | date, opponent, competition, score_for, score_against, position, minutes, starter, notes                                                                                                             |
| `match_statistics`           | match_id, goals, assists, passes_ok, passes_failed, recoveries, interceptions, shots, shots_on_target, duels_won, losses, fouls (todas **nullable**: nulo = no registrado)                           |
| `match_reflections`          | match_id, physical, focus, decisions, offered, helped_recover (1–5), did_well, to_improve, rating, best_play_media_path, best_play_text…                                                             |
| `wellness_logs`              | date (único por jugador), sleep_hours, sleep_quality, energy, soreness, discomfort, motivation, overall, hydration, traffic_light, notes                                                             |
| `goals`                      | name, description, start_date, target_date?, progress (0–100), status (pending / in_progress / completed), proposed_by, approved                                                                     |
| `assessments`                | date, dimension (control / pase / velocidad / resistencia / coordinación / visión), test_name, value, unit, score_1_10, notes                                                                        |
| `calendar_events`            | title, category, date, start_time?, est_minutes, description, status, linked_session_id?, linked_match_id?                                                                                           |
| `achievements` / `xp_events` | code, earned_at / source_type, source_id, points (único por fuente → no se duplica XP)                                                                                                               |
| `watch_uploads`              | workout_session_id, image_path, original_filename, uploaded_at, processing_status (queued / processing / done / failed), extracted_data jsonb, review_status, reviewed_by, reviewed_at, image_sha256 |
| `watch_metrics`              | upload_id, workout_session_id, metric_type (enum), metric_value, metric_unit, source, confidence (0–1), validation_status (pending / confirmed / corrected), confirmed_value, created_at             |

Restricciones clave:

- `watch_uploads.image_sha256` único por sesión → misma imagen dos veces no duplica.
- `watch_metrics (workout_session_id, metric_type)` con a lo sumo un valor confirmado por sesión → varias capturas del mismo entrenamiento no duplican métricas.
- Las estadísticas oficiales leen una **vista** `confirmed_watch_metrics` que solo incluye `validation_status in ('confirmed','corrected')`.
- `workout_sessions.client_id` único → los reintentos de la cola offline son idempotentes.

---

## 9. Offline y sincronización

| Caso                     | Estrategia                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Abrir la app sin señal   | Service worker sirve el app shell; TanStack Query muestra la última caché persistida con aviso "Sin conexión — datos guardados el …".                                                                                          |
| Registrar algo sin señal | La escritura va a una **cola en IndexedDB** con `client_id` (UUID generado en el cliente). Al volver la conexión se reenvía en orden; el servidor deduplica por `client_id`.                                                   |
| Modo entrenamiento       | El progreso (ejercicio actual, cronómetro, series) se guarda en IndexedDB en cada cambio y se sincroniza a `workout_sessions` al iniciar, en hitos y al finalizar. Si se cierra la app, al reabrir se ofrece "Retomar sesión". |
| Capturas del reloj       | Requieren conexión (subida + IA). Si no hay señal, se avisa y no se encola.                                                                                                                                                    |

En la UI siempre se distingue "guardado en el servidor" de "pendiente de sincronizar".

---

## 10. Registro del reloj (IA)

Flujo:

1. Admin elige la sesión (o crea un "registro de actividad" nuevo).
2. Selecciona 1..N imágenes → vista previa → puede quitar alguna.
3. Se suben al bucket privado (se comprimen en el cliente a ≤ 2048 px; se calcula SHA-256 para detectar duplicados).
4. Se invoca la Edge Function `watch-analyze` con los `upload_id`. La función verifica que quien llama sea admin del jugador.
5. La función envía las imágenes a Claude con **salida estructurada (JSON Schema)**: lista de métricas con `metric_type`, `value`, `unit`, `confidence`, `source_image`, y un campo `visible: false` / `illegible` cuando no se puede leer. Instrucción explícita: _extraer solo lo visible, no estimar ni completar_.
6. Se guardan como `watch_metrics` con `validation_status = 'pending'`; si la misma métrica aparece en dos capturas, se marca el conflicto para revisión.
7. Pantalla de validación: indicador · valor · unidad · fuente · confianza · estado; cada fila editable. Confianza baja o ilegible → resaltado "Requiere revisión manual".
8. Solo al confirmar o corregir pasa a las estadísticas. Se conservan valor original y confirmado.

Detalles:

- Catálogo de métricas normalizado (duración, FC media/máx, zonas, tiempo por zona, calorías, distancia, velocidad media/máx, ritmo, pasos, fecha/hora, tipo de actividad). El gráfico cardíaco se guarda como imagen de referencia; no se "reconstruyen" datos punto a punto.
- Independiente de la marca: el prompt describe métricas, no pantallas de un fabricante. Cuando sepamos el modelo del reloj, se agregan ejemplos específicos (sin cambiar el esquema).
- Clave `ANTHROPIC_API_KEY` y `WATCH_AI_MODEL` como **secretos de Supabase**; nunca en el frontend ni en el repo.
- Aviso permanente en la UI: "Datos estimados por el dispositivo. No son mediciones clínicas."

---

## 11. Manejo de errores y estados

Cada pantalla de datos implementa cuatro estados: **cargando** (skeleton), **vacío** (mensaje + acción sugerida), **error** (mensaje claro + reintentar), **con datos**. Un `ErrorBoundary` global evita pantallas en blanco. Las validaciones de formularios usan Zod y muestran mensajes en español.

---

## 12. Datos de demostración

No se cargan datos ficticios como reales. En la Fase 1 las pantallas muestran **estados vacíos** y los indicadores sin datos muestran "—" (nunca un cero engañoso). Las funciones no conectadas se señalan con un aviso explícito ("se habilita en la Fase N").

Excepciones, siempre rotuladas:

- La **vista previa del modo entrenamiento** usa la sesión de ejemplo de la especificación, con una franja "VISTA PREVIA · NO SE GUARDA NINGÚN DATO".
- El catálogo de componentes `/_design` (solo en desarrollo) usa valores de muestra.

Se descartó el "modo demo" con datos ficticios: los estados vacíos reales alcanzan para validar el diseño y evitan confusiones.

---

## 13. Preparación para versiones futuras

- `player_id` en todas las tablas → varios jugadores.
- `services/ai/` separado → futuro "entrenador inteligente" reutiliza la misma infraestructura de Edge Functions con solo lectura de datos confirmados.
- Rutas y módulos independientes → pizarra táctica, videoteca, trivia se suman como nuevas páginas sin tocar las existentes.

---

## 14. Decisiones tomadas

El usuario delegó estas decisiones. Criterio: lo más simple, seguro y fácil de cambiar después.

| #   | Tema                | Decisión                                                                                                                                                                                                                                                                                                                             | Motivo                                                                              |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | **Acceso de Benja** | Cuenta propia. Inicia sesión con **usuario + contraseña** (p. ej. `benja`); internamente se mapea a un email técnico no público (`benja@jugador.futbolista-pro.app`) porque Supabase Auth trabaja con emails. Papá entra con su email real. Registro público deshabilitado: papá crea las cuentas. Sesión persistente en el celular. | Permisos realmente separados (RLS por rol), sin que Benja necesite un email propio. |
| 2   | **Reloj**           | Diseño **agnóstico de marca**: catálogo normalizado de métricas y prompt que describe métricas, no pantallas de un fabricante. Cuando lleguen las primeras capturas reales se ajustan ejemplos en el prompt sin cambiar el esquema.                                                                                                  | No bloquea nada hasta la Fase 5.                                                    |
| 3   | **Supabase**        | Proyecto nuevo en el **plan gratuito**, región São Paulo (`sa-east-1`, la más cercana a Argentina). En desarrollo, Supabase local con la CLI + Docker. Migraciones SQL versionadas en el repo.                                                                                                                                       | Gratis, baja latencia, todo reproducible desde el código.                           |
| 4   | **Clave de IA**     | Se crea en la Fase 5 y se guarda solo como **secreto de Supabase** (`ANTHROPIC_API_KEY`). Modelo configurable con `WATCH_AI_MODEL` (por defecto `claude-opus-5-5`). Nunca en el repo, el frontend ni el chat.                                                                                                                        | Seguridad; se puede cambiar de modelo sin tocar código.                             |
| 5   | **Logo**            | Monograma **"FP"** geométrico en dorado degradado dentro de un anillo abierto (movimiento), sobre carbón. Logotipo "FUTBOLISTA **PRO**" en Outfit con tracking amplio. Implementado en `src/components/brand/Logo.tsx` y en los íconos de `public/icons/`.                                                                           | Premium, legible a 48 px, coherente con la paleta.                                  |
| 6   | **Hosting**         | **Vercel** (plan gratuito, HTTPS automático, despliegue por cada push, rewrites para SPA).                                                                                                                                                                                                                                           | El más simple para Vite + React; se configura en la Fase 7.                         |
| 7   | **Semana**          | Las semanas empiezan el **lunes**; fechas en español rioplatense (`es-AR`).                                                                                                                                                                                                                                                          | Uso habitual en Argentina.                                                          |
| 8   | **Versiones**       | React 19, Vite 8, Tailwind 4, React Router 7, TypeScript 6.0 (la 7 todavía no es compatible con `typescript-eslint`).                                                                                                                                                                                                                | Últimas estables compatibles entre sí.                                              |
