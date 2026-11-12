import { get, set } from 'idb-keyval';
import { sendSession, type SessionPayload } from '@/features/training/api';
import { sendMatch, type MatchPayload } from '@/features/matches/api';
import { sendWellness, type WellnessPayload } from '@/features/wellness/api';

/**
 * Cola de registros pendientes (modo sin conexión).
 *
 * Los registros se guardan primero en el celular (IndexedDB) y se envían a la
 * base apenas hay conexión. Cada registro lleva un client_id único: si un envío
 * se repite, la base no lo duplica. La base sigue siendo la fuente de verdad.
 */
interface OutboxBase {
  id: string; // = client_id del registro
  userId: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}
export type OutboxItem = OutboxBase &
  (
    | { kind: 'finish_session'; payload: SessionPayload }
    | { kind: 'save_match'; payload: MatchPayload }
    | { kind: 'save_wellness'; payload: WellnessPayload }
  );

/** Datos nuevos (sin `id`/`userId`...) listos para encolar. */
type NewItem =
  | { kind: 'finish_session'; payload: SessionPayload; id: string }
  | { kind: 'save_match'; payload: MatchPayload; id: string }
  | { kind: 'save_wellness'; payload: WellnessPayload; id: string };

function send(item: OutboxItem): Promise<string> {
  switch (item.kind) {
    case 'finish_session':
      return sendSession(item.payload);
    case 'save_match':
      return sendMatch(item.payload);
    case 'save_wellness':
      return sendWellness(item.payload);
  }
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

const EMPTY: OutboxItem[] = [];

/** Instantánea estable para useSyncExternalStore (misma referencia si no cambió). */
export function outboxSnapshot(): OutboxItem[] {
  return memory ?? EMPTY;
}

const isNetworkError = (e: unknown) =>
  (typeof navigator !== 'undefined' && !navigator.onLine) ||
  e instanceof TypeError ||
  /fetch|network|load failed/i.test(String((e as { message?: string })?.message ?? ''));

async function enqueue(userId: string, item: NewItem) {
  const items = await load();
  const next = items.filter((i) => i.id !== item.id);
  next.push({ ...item, userId, createdAt: Date.now(), attempts: 0 } as OutboxItem);
  await save(next);
  await flushOutbox(userId);
}

/** Guarda un registro en la cola e intenta enviarlo enseguida. */
export const enqueueSession = (userId: string, payload: SessionPayload) =>
  enqueue(userId, { kind: 'finish_session', payload, id: payload.session.client_id });

export const enqueueMatch = (userId: string, payload: MatchPayload) =>
  enqueue(userId, { kind: 'save_match', payload, id: payload.match.client_id });

export const enqueueWellness = (userId: string, payload: WellnessPayload) =>
  enqueue(userId, { kind: 'save_wellness', payload, id: payload.client_id });

/** Descarta un registro que todavía no se envió (nunca llegó a la base). */
export async function discardOutboxItem(id: string) {
  await save((await load()).filter((i) => i.id !== id));
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
          await send(item);
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
