/** Lógica pura de "watch-analyze" (sin Deno ni red), para poder probarla. */

export const METRIC_TYPES = [
  'duration',
  'heart_rate_avg',
  'heart_rate_max',
  'hr_zone_1',
  'hr_zone_2',
  'hr_zone_3',
  'hr_zone_4',
  'hr_zone_5',
  'calories',
  'distance',
  'speed_avg',
  'speed_max',
  'pace_avg',
  'steps',
  'activity_datetime',
  'activity_type',
] as const;
export type MetricType = (typeof METRIC_TYPES)[number];

export interface ExtractedMetric {
  metric_type: MetricType;
  value: string;
  unit: string | null;
  confidence: number;
  source: string | null;
}

export const SYSTEM_PROMPT = `Sos un asistente que lee capturas de pantalla de relojes deportivos de un chico que juega al fútbol.
Extraé SOLO los datos que se ven y se leen con claridad en la imagen. No estimes, no calcules, no completes ni inventes valores.
Si un dato no se ve o no se lee, no lo incluyas. Devolvé cada dato con su tipo, valor tal como aparece, unidad, una confianza de 0 a 1 y de qué parte de la imagen sale.
Los datos son estimaciones del dispositivo, no mediciones clínicas.`;

/** Esquema de la herramienta que el modelo debe usar para responder. */
export const TOOL = {
  name: 'registrar_metricas',
  description: 'Registra las métricas legibles de la captura del reloj.',
  input_schema: {
    type: 'object',
    properties: {
      metrics: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            metric_type: { type: 'string', enum: METRIC_TYPES },
            value: { type: 'string', description: 'Valor tal como se ve, sin unidad.' },
            unit: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            source: { type: 'string', description: 'Dónde se ve (ej. "resumen", "zonas").' },
          },
          required: ['metric_type', 'value', 'confidence'],
        },
      },
    },
    required: ['metrics'],
  },
} as const;

/** Valida y limpia lo que devolvió el modelo; descarta lo que no cumple el esquema. */
export function normalizeMetrics(raw: unknown): ExtractedMetric[] {
  const list = (raw as { metrics?: unknown })?.metrics;
  if (!Array.isArray(list)) return [];
  const out: ExtractedMetric[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const m = item as Record<string, unknown>;
    if (!METRIC_TYPES.includes(m.metric_type as MetricType)) continue;
    const value =
      typeof m.value === 'string' || typeof m.value === 'number' ? String(m.value).trim() : '';
    if (!value || value.length > 100) continue;
    const conf = Number(m.confidence);
    const confidence = Number.isFinite(conf)
      ? Math.min(1, Math.max(0, Math.round(conf * 100) / 100))
      : 0;
    const type = m.metric_type as MetricType;
    const key = `${type}|${value}`;
    if (seen.has(key)) continue; // mismo dato repetido en la misma imagen
    seen.add(key);
    const unit = typeof m.unit === 'string' && m.unit.trim() ? m.unit.trim().slice(0, 20) : null;
    const source =
      typeof m.source === 'string' && m.source.trim() ? m.source.trim().slice(0, 200) : null;
    out.push({ metric_type: type, value, unit, confidence, source });
  }
  return out;
}

/** Confianza baja: la pantalla de revisión lo resalta como "requiere revisión manual". */
export const LOW_CONFIDENCE = 0.6;

export function isValidUploadPath(path: string, playerId: string): boolean {
  return path.startsWith(`${playerId}/`) && !path.includes('..');
}
