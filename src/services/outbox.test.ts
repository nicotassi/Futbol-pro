import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
  del: vi.fn(async (k: string) => void store.delete(k)),
}));

const sendSession = vi.fn();
vi.mock('@/features/training/api', () => ({ sendSession: (...a: unknown[]) => sendSession(...a) }));

import {
  __resetOutboxForTests,
  enqueueSession,
  flushOutbox,
  listOutbox,
  setOutboxSyncedHandler,
} from './outbox';
import type { SessionPayload } from '@/features/training/api';

const payload = (clientId: string) =>
  ({ session: { client_id: clientId }, results: [] }) as unknown as SessionPayload;

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
}

describe('cola sin conexión', () => {
  beforeEach(() => {
    store.clear();
    sendSession.mockReset();
    __resetOutboxForTests();
    setOnline(true);
  });

  it('con conexión envía enseguida y vacía la cola', async () => {
    sendSession.mockResolvedValue('id');
    const synced = vi.fn();
    setOutboxSyncedHandler(synced);
    await enqueueSession('u1', payload('c1'));
    expect(sendSession).toHaveBeenCalledOnce();
    expect(await listOutbox('u1')).toEqual([]);
    expect(synced).toHaveBeenCalledOnce();
  });

  it('sin conexión guarda en el celular y envía al volver', async () => {
    setOnline(false);
    await enqueueSession('u1', payload('c1'));
    expect(sendSession).not.toHaveBeenCalled();
    expect((await listOutbox('u1')).map((i) => i.id)).toEqual(['c1']);
    expect(store.get('fp-outbox')).toBeTruthy(); // persistido

    setOnline(true);
    sendSession.mockResolvedValue('id');
    await flushOutbox('u1');
    expect(await listOutbox('u1')).toEqual([]);
  });

  it('un corte de red a mitad de envío conserva el registro', async () => {
    sendSession.mockRejectedValue(new TypeError('Failed to fetch'));
    await enqueueSession('u1', payload('c1'));
    const [item] = await listOutbox('u1');
    expect(item?.attempts).toBe(0);
  });

  it('un rechazo del servidor queda registrado para revisar', async () => {
    sendSession.mockRejectedValue({ message: 'permission denied', code: '42501' });
    await enqueueSession('u1', payload('c1'));
    const [item] = await listOutbox('u1');
    expect(item?.attempts).toBe(1);
    expect(item?.lastError).toBe('permission denied');
  });

  it('el mismo registro no se encola dos veces', async () => {
    setOnline(false);
    await enqueueSession('u1', payload('c1'));
    await enqueueSession('u1', payload('c1'));
    expect(await listOutbox('u1')).toHaveLength(1);
  });

  it('solo envía los registros del usuario que inició sesión', async () => {
    setOnline(false);
    await enqueueSession('u1', payload('c1'));
    await enqueueSession('u2', payload('c2'));
    setOnline(true);
    sendSession.mockResolvedValue('id');
    await flushOutbox('u2');
    expect(sendSession).toHaveBeenCalledOnce();
    expect((await listOutbox()).map((i) => i.id)).toEqual(['c1']);
  });
});

describe('instantánea de la cola', () => {
  it('devuelve siempre la misma referencia mientras no cambia (evita renders infinitos)', async () => {
    const { outboxSnapshot } = await import('./outbox');
    __resetOutboxForTests();
    expect(outboxSnapshot()).toBe(outboxSnapshot());
  });
});
