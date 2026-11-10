# FASE 1 — Diseño y estructura (plan)

> Estado: **pendiente de aprobación**. No se empieza a programar hasta validar `docs/ARQUITECTURA.md`.

**Objetivo:** primera interfaz funcional, navegable e instalable, con la identidad visual definitiva y los componentes reutilizables que usarán todas las fases siguientes.

**Fuera de alcance de la Fase 1:** Supabase, login real, guardado de datos, IA, gráficos. Las pantallas muestran estados vacíos honestos ("Todavía no registraste entrenamientos"), no datos inventados.

---

## Tareas

### 1.1 Proyecto base
- Crear proyecto Vite + React + TypeScript (`strict`).
- ESLint, Prettier, alias `@/` → `src/`.
- Vitest + Testing Library; Playwright con perfil Android (Pixel 7).
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`.
- `.env.example` (solo variables públicas `VITE_*`; ninguna clave privada).
- Estructura de carpetas según la arquitectura.

### 1.2 Identidad visual
- `styles/tokens.css`: colores, tipografía, espaciado, radios, sombras, duraciones.
- Tailwind v4 conectado a los tokens.
- Fuentes Outfit + Inter autoalojadas.
- Monograma/ícono "FP" (SVG) y logotipo con lema "Entrená. Aprendé. Evolucioná."
- Página interna `/_design` (solo en desarrollo) con todos los componentes para revisar el estilo.

### 1.3 Componentes reutilizables
| Grupo | Componentes |
|---|---|
| `ui/` | Button (primario dorado, secundario, fantasma), IconButton, Card, StatTile, Badge, Chip, ProgressBar, ProgressRing, Avatar, Input, Select, Textarea, Sheet (hoja inferior), Dialog, Tabs, Skeleton |
| `layout/` | AppShell, BottomNav (5 pestañas, estado activo dorado), SideNav (≥ 1024 px), TopBar, PageHeader, Section |
| `feedback/` | EmptyState, ErrorState, LoadingState, ErrorBoundary, OfflineBanner, Toast |

Todos accesibles (foco visible, `aria-*`, objetivos táctiles ≥ 44 px) y con soporte de `prefers-reduced-motion`.

### 1.4 Navegación y páginas
- Router con layout principal + navegación inferior.
- Pantallas con estructura y estados vacíos: Inicio, Entrenar, Biblioteca, Objetivos, Evolución, Perfil, Partidos, Recuperación, Calendario, Registro del reloj, Administración.
- Modo entrenamiento como pantalla completa (sin barra inferior), solo maqueta de la interfaz: cronómetro, anterior/siguiente, pausar, finalizar.
- Página 404.
- Transiciones suaves entre pantallas.

### 1.5 Dashboard (diseño)
- Saludo + tarjeta de perfil del jugador.
- Resumen semanal (minutos, sesiones) — en estado vacío.
- Último entrenamiento / próxima actividad — estado vacío con acción.
- Objetivos activos, último bienestar — estado vacío.
- Accesos rápidos destacados: Registrar entrenamiento, Registrar partido, Registrar bienestar, Ver evolución, Subir captura del reloj.
- Modo demo opcional solo en desarrollo, con franja visible "DATOS DE DEMOSTRACIÓN".

### 1.6 PWA base
- `vite-plugin-pwa`: manifest (nombre, colores, `display: standalone`, orientación vertical), íconos 192/512/maskable.
- Service worker con caché del app shell (abre sin conexión).
- Banner de "Sin conexión".

### 1.7 Pruebas y documentación
- Tests de componentes clave (BottomNav, EmptyState, Button).
- E2E: abrir la app, recorrer las 5 pestañas y los accesos rápidos en viewport Android; sin errores en consola.
- Lighthouse PWA/accesibilidad sobre el build.
- Actualizar README con instalación y uso.

---

## Criterios de aceptación

- [ ] `npm run build`, `lint`, `typecheck` y `test` pasan sin errores.
- [ ] La app se ve correctamente a 360 px, 412 px (Android), 768 px y 1280 px, sin scroll horizontal.
- [ ] Las 5 pestañas y todas las pantallas secundarias son navegables; el botón atrás de Android funciona.
- [ ] Ninguna pantalla muestra datos inventados como reales.
- [ ] La PWA es instalable (manifest + service worker válidos) y abre sin conexión.
- [ ] Contraste AA en textos; navegación por teclado operativa.
- [ ] Capturas de pantalla de cada vista entregadas para revisión.

## Cómo se va a probar

1. `npm install && npm run dev` → abrir en el celular por la red local (o con `vite preview`).
2. Recorrer pestañas y accesos rápidos.
3. Chrome Android → "Instalar app" → abrir desde el ícono → activar modo avión → la app abre.

## Entregable al cerrar la fase

Resumen de lo construido, capturas, cómo probarlo y lista de pendientes para la Fase 2 (Supabase, usuarios y RLS).
