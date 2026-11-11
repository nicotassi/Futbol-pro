# FASES 5, 6 y 7 — Reloj con IA, evolución y cierre

> Estado: **implementadas y publicadas**. Migraciones `1100`, `1200` y `1300` aplicadas en Supabase.

## Fase 5 — Datos del reloj (carga manual)

Se descartó la lectura de capturas con IA (requería pagar la API aparte). En su lugar, **al terminar un entrenamiento** (modo entrenamiento y entrenamiento libre) se pueden cargar a mano los datos que muestra el reloj. Todo es opcional: lo que se deja vacío queda "sin registrar".

| Dato                                     | Validación                                           |
| ---------------------------------------- | ---------------------------------------------------- |
| Ritmo cardíaco promedio y máximo         | 30 a 250 lpm; el promedio no puede superar al máximo |
| Calorías                                 | 0 a 10.000 kcal                                      |
| Carga de entrenamiento                   | 0 a 3.000                                            |
| Efecto aeróbico y anaeróbico             | 1,0 a 5,0 con un decimal                             |
| Zonas VO2 máx e Intensivo (% del tiempo) | 0 a 100 %; entre las dos no pueden pasar de 100 %    |

- Los datos se pueden **cargar o corregir después** desde el detalle de la sesión en el historial.
- Funcionan **sin conexión** (viajan con la sesión en la cola) y las reglas están también en la base de datos.
- Se quitó la pantalla "Registro del reloj", y la función `watch-analyze` quedó **desactivada** (responde "desactivada" y no usa ninguna clave). Ya no hace falta `ANTHROPIC_API_KEY`: se puede borrar el secreto y la función desde el panel de Supabase si se quiere. Las tablas `watch_uploads` y `watch_metrics` quedaron sin uso (no se borró nada).

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
| Base de datos (`npm run db:test`): 191 verificaciones | ✅        |
| Tests unitarios (`npm test`)                          | ✅        |
| Tests e2e (`npm run test:e2e`), Android y escritorio  | ✅        |
| Migraciones y función aplicadas en Supabase           | ✅        |

## Ajustes posteriores

- **Rutinas más libres:** al armar un entrenamiento, papá puede tocar **"Crear ejercicio nuevo"** dentro de la hoja "Agregar ejercicio": nombre, categoría, minutos y pasos. El ejercicio se guarda en la biblioteca y se suma a la rutina al instante. Se puede repetir un ejercicio, reordenar y ajustar series, repeticiones, duración y descanso de cada uno.
- **Modo oscuro:** en Perfil → Apariencia: _Automático_ (sigue al celular), _Claro_ u _Oscuro_. Se recuerda en el dispositivo y se aplica antes de dibujar la pantalla (sin destello blanco).
- **Editar entrenamientos ya hechos:** en Historial, al abrir una sesión, el botón **Editar entrenamiento** permite cambiar nombre, día (se conserva la hora), minutos, esfuerzo, cómo terminó, observaciones, qué ejercicios se completaron y los datos del reloj. Lo pueden hacer Benja y papá; se edita la misma sesión (no se duplica) y requiere conexión.
