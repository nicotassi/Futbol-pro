# services/

Acceso a datos y servicios externos. Se completa a partir de la Fase 2:

- `supabase.ts` — cliente de Supabase (solo URL y anon key públicas).
- `syncQueue.ts` — cola de escrituras pendientes en IndexedDB (modo sin conexión).
- `watchAnalysis.ts` — invocación de la Edge Function `watch-analyze` (Fase 5).

Ninguna clave privada vive en el frontend.
