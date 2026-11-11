import { describe, expect, it } from 'vitest';
import { isValidUploadPath, normalizeMetrics } from './logic';

describe('normalizeMetrics', () => {
  it('acepta métricas válidas y limpia los valores', () => {
    const r = normalizeMetrics({
      metrics: [
        {
          metric_type: 'heart_rate_avg',
          value: ' 142 ',
          unit: 'bpm',
          confidence: 0.934,
          source: 'resumen',
        },
        { metric_type: 'calories', value: 310, confidence: 2 },
      ],
    });
    expect(r).toEqual([
      {
        metric_type: 'heart_rate_avg',
        value: '142',
        unit: 'bpm',
        confidence: 0.93,
        source: 'resumen',
      },
      { metric_type: 'calories', value: '310', unit: null, confidence: 1, source: null },
    ]);
  });

  it('descarta tipos desconocidos, valores vacíos y repetidos', () => {
    const r = normalizeMetrics({
      metrics: [
        { metric_type: 'vo2max', value: '50', confidence: 1 },
        { metric_type: 'steps', value: '', confidence: 1 },
        { metric_type: 'steps', value: '3000', confidence: 0.8 },
        { metric_type: 'steps', value: '3000', confidence: 0.8 },
      ],
    });
    expect(r).toHaveLength(1);
  });

  it('una respuesta inválida no genera datos', () => {
    expect(normalizeMetrics(null)).toEqual([]);
    expect(normalizeMetrics({ metrics: 'x' })).toEqual([]);
    expect(
      normalizeMetrics({ metrics: [{ metric_type: 'steps', value: '1', confidence: 'alta' }] })[0]
        ?.confidence,
    ).toBe(0);
  });
});

describe('rutas de imágenes', () => {
  it('solo acepta archivos de la carpeta del jugador', () => {
    expect(isValidUploadPath('p1/s1/a.jpg', 'p1')).toBe(true);
    expect(isValidUploadPath('p2/s1/a.jpg', 'p1')).toBe(false);
    expect(isValidUploadPath('p1/../p2/a.jpg', 'p1')).toBe(false);
  });
});
