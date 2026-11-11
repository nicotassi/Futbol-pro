import { get, set } from 'idb-keyval';
import { sendSession, type SessionPayload } from '@/features/training/api';

/**
 * Cola de registros pendientes (modo sin conexión).
 *
 * Los registros se guardan primero en el celular (IndexedDB) y se envían a la
 * base apenas hay conexión. Cada registro lleva un client_id único: si un envío
 * se repite, la base no lo duplica. La base sigue siendo la fuente de verdad.
 */
export interface OutboxItem {
  id: string; // = client_id de la sesión
  userId: string;
  kind: 'finish_session';
  payload: SessionPayload;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const KEY = 'fp-outbox';
let memory: OutboxItem[] | null = null;
let flushing: Promise<void> | null = null;
const listeners = new Set<() => void>();
let onSynced: (() => void) | null = null;

async function load(): Promise<OutboxItem[]> {
  if (memory) return memory;
  try {
    memory = (await get<OutboxItem[]>(KEY)) ?? [];
  } catch {
    memory = [];
  }
  listeners.forEach((l) => l());
  return memory;
}

async function save(items: OutboxItem[]) {
  memory = items;
  try {
    await set(KEY, items);
  } catch {
    // Sin IndexedDB (modo privado): queda en memoria mientras la app esté abierta.
  }
  listeners.forEach((l) => l());
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Se llama cuando un envío pendiente se completó (para refrescar pantallas). */
export function setOutboxSyncedHandler(handler: (() => void) | null) {
  onSynced = handler;
}

export async function listOutbox(userId?: string): Promise<OutboxItem[]> {
  const items = await load();
  return userId ? items.filter((i) => i.userId === userId) : items;
}

export function outboxSnapshot(): OutboxItem[] {
  return memory ?? [];
}

const isNetworkError = (e: unknown) =>
  (typeof navigator !== 'undefined' && !navigator.onLine) ||
  e instanceof TypeError ||
  /fetch|network|load failed/i.test(String((e as { message?: string })?.message ?? ''));

/** Guarda un registro en la cola e intenta enviarlo enseguida. */
export async function enqueueSession(userId: string, payload: SessionPayload) {
  const items = await load();
  const id = payload.session.client_id;
  const next = items.filter((i) => i.id !== id);
  next.push({ id, userId, kind: 'finish_session', payload, createdAt: Date.now(), attempts: 0 });
  await save(next);
  await flushOutbox(userId);
}

/** Envía los pendientes del usuario actual, en orden. */
export function flushOutbox(userId: string): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      let items = await load();
      let synced = false;
      for (const item of items.filter((i) => i.userId === userId)) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) break;
        try {
          await sendSession(item.payload);
          items = (await load()).filter((i) => i.id !== item.id);
          await save(items);
          synced = true;
        } catch (e) {
          if (isNetworkError(e)) break; // se reintenta al volver la conexión
          items = (await load()).map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  attempts: i.attempts + 1,
                  lastError: (e as { message?: string })?.message ?? 'Error',
                }
              : i,
          );
          await save(items);
        }
      }
      if (synced) onSynced?.();
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Solo para tests. */
export function __resetOutboxForTests() {
  memory = null;
  flushing = null;
  listeners.clear();
  onSynced = null;
}
