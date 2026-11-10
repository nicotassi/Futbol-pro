# FUTBOLISTA PRO

**Entrená. Aprendé. Evolucioná.**

Aplicación web progresiva (PWA), mobile-first y privada, para seguir y desarrollar el rendimiento futbolístico de un jugador infantil. Tiene dos perfiles: jugador y administrador (papá).

## Estado del proyecto

| Fase | Contenido                                                  | Estado                      |
| ---- | ---------------------------------------------------------- | --------------------------- |
| 0    | Análisis del entorno, arquitectura y plan                  | ✅ Aprobada                 |
| 1    | Diseño, estructura, navegación, PWA base                   | ✅ Implementada — a validar |
| 2    | Supabase: base de datos, usuarios, RLS                     | ⏭️ Siguiente                |
| 3    | Entrenamiento: biblioteca, constructor, modo entrenamiento | —                           |
| 4    | Partidos, bienestar, objetivos, evaluaciones               | —                           |
| 5    | Registro del reloj con IA y validación manual              | —                           |
| 6    | Evolución, gráficos, calendario, logros                    | —                           |
| 7    | Pruebas en Android y publicación                           | —                           |

**Importante:** en la Fase 1 todavía no hay base de datos ni inicio de sesión, así que **no se guarda nada**. Las pantallas muestran estados vacíos reales, y cada función que todavía no está conectada lo indica con un aviso ("se habilita en la Fase N").

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

> La primera vez que corras los tests e2e en otra máquina hay que instalar el navegador: `npx playwright install chromium`.

## Probar la PWA en Android

1. `npm run build && npm run preview`
2. En el celular (misma red), abrí la dirección `Network` en Chrome.
3. Menú ⋮ → **Agregar a la pantalla principal / Instalar app**.

   Nota: Chrome solo ofrece instalar en `localhost` o con HTTPS. Desde la red local probablemente no aparezca la opción "Instalar"; la instalación completa se prueba al publicar en Vercel (Fase 7). Para probarla antes desde la PC: Chrome → `http://localhost:4173` → ícono de instalar en la barra de direcciones.

4. Con la app abierta una vez, activá el modo avión: la app sigue abriendo y muestra el aviso "Sin conexión".

## Configuración

Copiá `.env.example` a `.env.local`. En la Fase 1 no hace falta ninguna variable.

**Nunca** se ponen claves privadas en el frontend ni en el repositorio. La clave de IA se carga como secreto de Supabase en la Fase 5.

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
  services/       (Fase 2+) Supabase, cola offline, análisis del reloj
  contexts/       (Fase 2+) AuthContext
  types/          Tipos de dominio
  utils/          Fechas, clases CSS
  styles/         globals.css con los tokens de diseño
public/icons/     Íconos de la PWA
supabase/         (Fase 2+) migraciones y Edge Functions
tests/e2e/        Playwright
docs/             Arquitectura, planes por fase, capturas
```

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): stack, modelo de datos, seguridad, modo sin conexión, IA y decisiones tomadas.
- [`docs/PLAN_FASE_1.md`](docs/PLAN_FASE_1.md): plan, criterios de aceptación y resultado de la Fase 1.
- [`docs/capturas/`](docs/capturas): capturas de pantalla de la Fase 1.

## Privacidad

App privada para un menor de edad: sin publicidad, sin perfiles públicos, sin rankings entre chicos, sin ubicación y sin indexación en buscadores (`robots.txt` y `noindex`).
