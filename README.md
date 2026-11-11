# FUTBOLISTA PRO

**Entrená. Aprendé. Evolucioná.**

Aplicación web progresiva (PWA), mobile-first y privada, para seguir y desarrollar el rendimiento futbolístico de un jugador infantil. Tiene dos perfiles: jugador y administrador (papá).

## Estado del proyecto

| Fase | Contenido                                                  | Estado       |
| ---- | ---------------------------------------------------------- | ------------ |
| 0    | Análisis del entorno, arquitectura y plan                  | ✅ Aprobada  |
| 1    | Diseño, estructura, navegación, PWA base                   | ✅ Validada  |
| 2    | Supabase: base de datos, usuarios, RLS                     | ⏭️ Siguiente |
| 3    | Entrenamiento: biblioteca, constructor, modo entrenamiento | —            |
| 4    | Partidos, bienestar, objetivos, evaluaciones               | —            |
| 5    | Registro del reloj con IA y validación manual              | —            |
| 6    | Evolución, gráficos, calendario, logros                    | —            |
| 7    | Pruebas en Android y publicación                           | —            |

Desde la Fase 2 la app guarda los datos en **Supabase** (PostgreSQL con permisos por fila), con inicio de sesión para papá y para Benja. Las funciones de las fases siguientes aparecen con un aviso: "se habilita en la Fase N".

## Requisitos

- Node.js 20 o superior (recomendado 22 LTS)
- npm 10 o superior

## Instalación y desarrollo

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
```

Para verla en el celular, conectalo a la misma red Wi-Fi y abrí la dirección `Network` que imprime `npm run dev` (por ejemplo, `http://192.168.0.10:5173`).

El catálogo visual de componentes está en `/_design`. Solo existe en modo desarrollo.

## Scripts

| Comando             | Qué hace                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `npm run dev`       | Servidor de desarrollo con recarga en caliente                           |
| `npm run build`     | Verifica tipos y genera el build de producción en `dist/`                |
| `npm run preview`   | Sirve el build de producción (incluye el service worker de la PWA)       |
| `npm run typecheck` | Verificación de tipos de TypeScript                                      |
| `npm run lint`      | ESLint                                                                   |
| `npm run format`    | Prettier                                                                 |
| `npm test`          | Tests unitarios y de componentes (Vitest)                                |
| `npm run test:e2e`  | Tests end-to-end en viewport Android (Pixel 7) y escritorio (Playwright) |
| `npm run db:test`   | Migraciones + 70 pruebas de permisos (RLS) sobre PostgreSQL              |
| `npm run db:push`   | Aplica las migraciones al proyecto de Supabase vinculado                 |
| `npm run family`    | Alta de cuentas y cambio de contraseñas (usa la clave secreta)           |

> La primera vez que corras los tests e2e en otra máquina hay que instalar el navegador: `npx playwright install chromium`.

## Probar la PWA en Android

1. `npm run build && npm run preview`
2. En el celular (misma red), abrí la dirección `Network` en Chrome.
3. Menú ⋮ → **Agregar a la pantalla principal / Instalar app**.

   Nota: Chrome solo ofrece instalar en `localhost` o con HTTPS. Desde la red local probablemente no aparezca la opción "Instalar"; la instalación completa se prueba al publicar en Vercel (Fase 7). Para probarla antes desde la PC: Chrome → `http://localhost:4173` → ícono de instalar en la barra de direcciones.

4. Con la app abierta una vez, activá el modo avión: la app sigue abriendo y muestra el aviso "Sin conexión".

## Fase 2: poner en marcha Supabase (una sola vez)

Se hace en unos 15 minutos desde la computadora de papá.

1. **Crear el proyecto.** En [supabase.com](https://supabase.com) creá una cuenta gratuita y un proyecto nuevo:
   - Nombre: `futbolista-pro`.
   - Región: **South America (São Paulo)**.
   - Guardá la contraseña de la base en un lugar seguro.
2. **Desactivar el registro público.** En Authentication → Sign In / Providers, desactivá **"Allow new users to sign up"**. Las cuentas las crea el script del paso 5.
3. **Crear las tablas y la seguridad:**
   ```bash
   npx supabase login
   npm run db:link        # elegí el proyecto futbolista-pro
   npm run db:push        # aplica supabase/migrations
   ```
4. **Conectar la app.** Creá `.env.local` con los datos de Project Settings → API Keys:
   ```
   VITE_SUPABASE_URL=https://<proyecto>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<clave publicable>
   ```
5. **Crear las cuentas.** Creá `.env.server.local` (nunca se sube al repositorio) con:
   ```
   SUPABASE_URL=https://<proyecto>.supabase.co
   SUPABASE_SECRET_KEY=<clave secreta>
   ```
   Después ejecutá:
   ```bash
   npm run family -- setup      # pide tu email, contraseña y el usuario y contraseña de Benja
   ```
6. `npm run dev` → ingresá con tu email. Benja ingresa con su usuario, por ejemplo `benja`.

### Mantenimiento de cuentas

```bash
npm run family -- password benja   # cambiar la contraseña de Benja
npm run family -- status           # ver jugadores y accesos
```

### Lista de verificación con el proyecto real

- [ ] Papá ingresa y ve "Seguimiento de Benja" en Inicio y la sección Administración.
- [ ] Papá edita el perfil del jugador (fecha de nacimiento, club) y, al recargar, los cambios siguen ahí.
- [ ] Benja ingresa con su usuario, ve su nombre y edad, y **no** ve Administración ni Registro del reloj.
- [ ] Cerrar sesión vuelve a la pantalla de ingreso.
- [ ] Con la app abierta una vez, en modo avión vuelve a abrir mostrando los datos.

## Configuración y secretos

| Archivo              | Contenido                                         | ¿Se sube al repositorio? |
| -------------------- | ------------------------------------------------- | ------------------------ |
| `.env.local`         | URL y clave **publicable** de Supabase (frontend) | No                       |
| `.env.server.local`  | Clave **secreta** (solo para `npm run family`)    | **Nunca**                |
| Secretos de Supabase | Clave de IA (Fase 5)                              | No (viven en Supabase)   |

La clave publicable es pública por diseño: la seguridad la dan las políticas RLS de la base. La clave secreta saltea esas políticas, por eso nunca va al frontend.

## Base de datos

- **Migraciones** en `supabase/migrations/`: tablas, índices, RLS y storage.
- **Pruebas de seguridad** en `supabase/tests/`, sin Docker y con PostgreSQL local:
  ```bash
  PGHOST=/tmp PGPORT=5432 PGUSER=postgres npm run db:test
  ```
- **Tipos de TypeScript:** con el proyecto vinculado se regeneran con `npm run db:types`.

## Estructura

```
src/
  app/            Arranque: App, router
  components/
    ui/           Primitivas: Button, Card, StatTile, Badge, Chip, Field, Segmented, Sheet, Progress…
    layout/       AppShell, BottomNav, SideNav, TopBar, PageHeader, Section
    feedback/     EmptyState, ErrorState, LoadingState, ErrorBoundary, OfflineBanner, PhaseNotice
    brand/        Logo (monograma FP) y logotipo
  pages/          Una carpeta por módulo (Dashboard, Training, Exercises, Goals, Evolution, Profile,
                  Matches, Recovery, Calendar, WatchUpload, Administration, NotFound, DesignSystem)
  config/         Navegación, categorías de ejercicios, perfil inicial, nombres de fases
  hooks/          useOnlineStatus, useStopwatch, useDocumentTitle
  features/       Lógica por dominio: auth (ingreso, guards), players (API, formulario)
  services/       Cliente Supabase, caché de consultas, identidad, errores
  contexts/       AuthProvider / useAuth
  types/          Tipos de dominio
  utils/          Fechas, clases CSS
  styles/         globals.css con los tokens de diseño
public/icons/     Íconos de la PWA
supabase/         Migraciones SQL, pruebas de RLS y config
scripts/          family.mjs (cuentas), db-test.sh (pruebas de base)
tests/e2e/        Playwright
docs/             Arquitectura, planes por fase, capturas
```

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): stack, modelo de datos, seguridad, modo sin conexión, IA y decisiones tomadas.
- [`docs/PLAN_FASE_1.md`](docs/PLAN_FASE_1.md): plan, criterios de aceptación y resultado de la Fase 1.
- [`docs/PLAN_FASE_2.md`](docs/PLAN_FASE_2.md): base de datos, permisos, autenticación y verificación.
- [`docs/capturas/`](docs/capturas): capturas de pantalla de la Fase 1.

## Privacidad

App privada para un menor de edad: sin publicidad, sin perfiles públicos, sin rankings entre chicos, sin ubicación y sin indexación en buscadores (`robots.txt` y `noindex`).
