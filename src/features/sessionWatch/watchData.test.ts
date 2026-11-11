import { describe, expect, it } from 'vitest';
import {
  emptyWatchForm,
  formatWatchData,
  hasWatchData,
  parseWatchForm,
  watchFormFrom,
} from './watchData';

const form = (patch: Record<string, string>) => ({ ...emptyWatchForm(), ...patch });

describe('datos del reloj', () => {
  it('todo vacío es válido y queda sin registrar', () => {
    const r = parseWatchForm(emptyWatchForm());
    expect('data' in r && hasWatchData(r.data)).toBe(false);
  });

  it('acepta coma o punto decimal y convierte a número', () => {
    const r = parseWatchForm(
      form({
        hr_avg: '142',
        hr_max: '178',
        calories: '320',
        training_load: '95',
        aerobic_effect: '3,4',
        anaerobic_effect: '1.2',
        zone_vo2max_pct: '12,5',
        zone_intensive_pct: '30',
      }),
    );
    expect(r).toEqual({
      data: {
        hr_avg: 142,
        hr_max: 178,
        calories: 320,
        training_load: 95,
        aerobic_effect: 3.4,
        anaerobic_effect: 1.2,
        zone_vo2max_pct: 12.5,
        zone_intensive_pct: 30,
      },
    });
  });

  it.each([
    ['ritmo fuera de rango', { hr_avg: '20' }],
    ['ritmo con decimales', { hr_max: '150.5' }],
    ['promedio mayor que el máximo', { hr_avg: '180', hr_max: '150' }],
    ['calorías negativas', { calories: '-5' }],
    ['efecto menor a 1', { aerobic_effect: '0.5' }],
    ['efecto mayor a 5', { anaerobic_effect: '5.1' }],
    ['efecto con dos decimales', { aerobic_effect: '3.45' }],
    ['porcentaje mayor a 100', { zone_intensive_pct: '120' }],
    ['zonas que suman más de 100', { zone_vo2max_pct: '70', zone_intensive_pct: '40' }],
    ['texto en vez de número', { training_load: 'alta' }],
  ])('rechaza: %s', (_n, patch) => {
    expect('error' in parseWatchForm(form(patch))).toBe(true);
  });

  it('el 5,0 y el 1,0 son válidos; el límite de zonas (100) también', () => {
    expect(
      'data' in
        parseWatchForm(
          form({
            aerobic_effect: '5',
            anaerobic_effect: '1,0',
            zone_vo2max_pct: '60',
            zone_intensive_pct: '40',
          }),
        ),
    ).toBe(true);
  });

  it('muestra solo lo registrado, con unidades', () => {
    expect(
      formatWatchData({ hr_avg: 142, calories: null, aerobic_effect: 3.4, zone_vo2max_pct: 12.5 }),
    ).toEqual([
      ['Ritmo cardíaco promedio', '142 lpm'],
      ['Efecto aeróbico', '3,4'],
      ['Zona VO2 máx', '12,5 %'],
    ]);
  });

  it('el formulario se rellena desde datos guardados', () => {
    expect(watchFormFrom({ hr_avg: 140, calories: null }).hr_avg).toBe('140');
    expect(watchFormFrom({ calories: null }).calories).toBe('');
  });
});
