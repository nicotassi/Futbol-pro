import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
  del: vi.fn(async (k: string) => void store.delete(k)),
}));

const sendSession = vi.fn();
vi.mock('@/features/training/api', () => ({ sendSession: (...a: unknown[]) => sendSession(...a) }));

const sendMatch = vi.fn();
vi.mock('@/features/matches/api', () => ({ sendMatch: (...a: unknown[]) => sendMatch(...a) }));
const sendWellness = vi.fn();
vi.mock('@/features/wellness/api', () => ({
  sendWellness: (...a: unknown[]) => sendWellness(...a),
}));

import {
  enqueueMatch,
  enqueueWellness,
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

describe('cola: partidos y bienestar', () => {
  beforeEach(() => {
    store.clear();
    sendMatch.mockReset();
    sendWellness.mockReset();
    __resetOutboxForTests();
    setOnline(false);
  });

  it('un partido y un bienestar sin conexión se envían al volver, cada uno a su destino', async () => {
    await enqueueMatch('u1', { match: { client_id: 'm1' } } as never);
    await enqueueWellness('u1', { client_id: 'w1' } as never);
    expect((await listOutbox('u1')).map((i) => i.kind)).toEqual(['save_match', 'save_wellness']);
    setOnline(true);
    sendMatch.mockResolvedValue('id');
    sendWellness.mockResolvedValue('id');
    await flushOutbox('u1');
    expect(sendMatch).toHaveBeenCalledOnce();
    expect(sendWellness).toHaveBeenCalledOnce();
    expect(await listOutbox('u1')).toEqual([]);
  });

  it('reeditar un partido pendiente reemplaza el anterior (mismo client_id)', async () => {
    await enqueueMatch('u1', { match: { client_id: 'm1', opponent: 'A' } } as never);
    await enqueueMatch('u1', { match: { client_id: 'm1', opponent: 'B' } } as never);
    const items = await listOutbox('u1');
    expect(items).toHaveLength(1);
    expect((items[0]!.payload as { match: { opponent: string } }).match.opponent).toBe('B');
  });
});

describe('instantánea de la cola', () => {
  it('devuelve siempre la misma referencia mientras no cambia (evita renders infinitos)', async () => {
    const { outboxSnapshot } = await import('./outbox');
    __resetOutboxForTests();
    expect(outboxSnapshot()).toBe(outboxSnapshot());
  });
});
