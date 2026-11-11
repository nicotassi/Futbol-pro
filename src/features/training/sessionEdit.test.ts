import { describe, expect, it } from 'vitest';
import { buildSessionPatch, type SessionEditForm } from './sessionEdit';
import { emptyWatchForm } from '@/features/sessionWatch/watchData';

const original = { started_at: '2026-11-09T13:00:00', ended_at: '2026-11-09T13:40:00' };
const base = (o: Partial<SessionEditForm> = {}): SessionEditForm => ({
  title: 'Plaza',
  date: '2026-11-09',
  minutes: '40',
  rpe: 6,
  postState: 4,
  notes: '',
  watch: emptyWatchForm(),
  ...o,
});
const run = (o: Partial<SessionEditForm> = {}) =>
  buildSessionPatch(base(o), original, '2026-11-11');

describe('editar una sesión ya hecha', () => {
  it('guarda los cambios y deja vacío lo que se borra', () => {
    const r = run({ title: ' Plaza de nuevo ', rpe: null, notes: '  ' });
    expect('patch' in r && r.patch).toMatchObject({
      title: 'Plaza de nuevo',
      rpe: null,
      notes: null,
      post_state: 4,
      hr_avg: null,
    });
  });

  it('cambiar los minutos recalcula el fin y conserva el inicio', () => {
    const r = run({ minutes: '55' });
    if (!('patch' in r)) throw new Error('debía ser válido');
    expect(new Date(r.patch.started_at).getTime()).toBe(new Date(original.started_at).getTime());
    expect(new Date(r.patch.ended_at!).getTime() - new Date(r.patch.started_at).getTime()).toBe(
      55 * 60000,
    );
  });

  it('cambiar el día conserva la hora original', () => {
    const r = run({ date: '2026-11-07' });
    if (!('patch' in r)) throw new Error('debía ser válido');
    expect(
      r.patch.started_at.startsWith('2026-11-07') || r.patch.started_at.startsWith('2026-11-08'),
    ).toBe(true);
    expect(new Date(r.patch.started_at).getHours()).toBe(13);
  });

  it('los minutos pueden quedar vacíos', () => {
    const r = run({ minutes: '' });
    expect('patch' in r && r.patch.actual_minutes).toBeNull();
  });

  it.each([
    ['nombre corto', { title: 'P' }],
    ['fecha futura', { date: '2026-12-01' }],
    ['minutos inválidos', { minutes: '700' }],
    ['minutos decimales', { minutes: '40.5' }],
    ['dato del reloj inválido', { watch: { ...emptyWatchForm(), aerobic_effect: '9' } }],
  ])('rechaza: %s', (_n, o) => {
    expect('error' in run(o as Partial<SessionEditForm>)).toBe(true);
  });
});
