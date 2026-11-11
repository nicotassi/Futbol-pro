# FASES 5, 6 y 7 — Reloj con IA, evolución y cierre

> Estado: **implementadas y publicadas**. Migración `1200` y la función `watch-analyze` están aplicadas en Supabase.

## Fase 5 — Registro del reloj (solo papá, `/reloj`)

- **Subir capturas** de una sesión: se comprimen en el celular (hasta 2048 px, JPG), se calcula su huella SHA-256 (la misma imagen no se carga dos veces en una sesión) y se guardan en el bucket privado `watch-screenshots`.
- **Análisis con IA**: la Edge Function `watch-analyze` (solo para el administrador del jugador) lee las imágenes con Claude usando salida estructurada y guarda cada dato como **pendiente**. Instrucción explícita: solo lo visible y legible, nada estimado.
- **Revisión de papá**: confirmar, corregir (se conserva el valor original) o descartar. Los datos con confianza menor a 60 % se marcan "Requiere revisión manual".
- **Un solo valor oficial** por sesión y métrica: confirmar otro reemplaza al anterior, que queda como "descartado" (no se borra).
- **Carga manual** de un dato (sin captura), ya confirmado.
- Los datos confirmados se ven en el **detalle de cada sesión** del historial. Lo pendiente no cuenta en ninguna estadística.
- ⚠️ **Falta un paso de papá/Nico: la clave de IA.** Hasta que se cargue el secreto `ANTHROPIC_API_KEY` en Supabase (Edge Functions → Secrets), el análisis automático responde "Falta configurar la clave de IA" y las capturas quedan guardadas; la **carga manual funciona igual**. Opcional: `WATCH_AI_MODEL` para elegir el modelo.

## Fase 6 — Evolución, calendario y logros

- **Evolución** (`/evolucion`) con gráficos propios en SVG (sin librerías): minutos por semana (8 semanas), sueño de los últimos registros, autoevaluación por partido, **radar de capacidades** (última evaluación de cada una; lo no evaluado queda vacío) y **comparativas** semana/mes que solo muestran porcentajes cuando hay período anterior con datos. Todo se compara solo con uno mismo.
- **Calendario** (`/calendario`): vistas día, semana y mes con entrenamientos hechos, entrenamientos programados, partidos, evaluaciones y eventos. Papá crea eventos (club, descanso, especial…) y los **cancela** (se marcan, no se borran). Resumen de la semana.
- **Puntos, niveles y logros** (`/objetivos`): se calculan de los registros reales. Los puntos premian la **constancia, no la cantidad** (a lo sumo un entrenamiento y un partido por día; registrar bienestar y descansar también suma). 6 niveles y 10 logros (primer entrenamiento, rachas de 3 y 7 días, objetivo cumplido, etc.).

## Fase 7 — Cierre y publicación

- App publicada en GitHub Pages con `scripts/deploy-pages.sh` (PWA instalable, funciona sin conexión).
- Verificada en el emulador de Android (Pixel 7) y en escritorio con Playwright.
- ⚠️ **Prueba en un celular Android real**: no se puede hacer desde este entorno. Pasos: abrir https://nicotassi.github.io/Futbol-pro/ en Chrome → menú ⋮ → "Instalar app" → probar con el modo avión.

## Verificación

| Prueba                                                | Resultado |
| ----------------------------------------------------- | --------- |
| Base de datos (`npm run db:test`): 174 verificaciones | ✅        |
| Tests unitarios (`npm test`)                          | ✅        |
| Tests e2e (`npm run test:e2e`), Android y escritorio  | ✅        |
| Migraciones y función aplicadas en Supabase           | ✅        |

## Ajustes posteriores

- **Rutinas más libres:** al armar un entrenamiento, papá puede tocar **"Crear ejercicio nuevo"** dentro de la hoja "Agregar ejercicio": nombre, categoría, minutos y pasos. El ejercicio se guarda en la biblioteca y se suma a la rutina al instante. Se puede repetir un ejercicio, reordenar y ajustar series, repeticiones, duración y descanso de cada uno.
- **Modo oscuro:** en Perfil → Apariencia: _Automático_ (sigue al celular), _Claro_ u _Oscuro_. Se recuerda en el dispositivo y se aplica antes de dibujar la pantalla (sin destello blanco).
