import type { Enums } from '@/types/database';

export type TrafficLight = Enums<'traffic_light'>;

export interface WellnessInput {
  sleep_hours: number | null;
  sleep_quality: number | null;
  energy: number | null;
  soreness: number | null;
  motivation: number | null;
  overall: number | null;
  hydration: number | null;
  pain_level: number;
  sick: boolean;
  discomfort: string | null;
}

/**
 * Semáforo de bienestar. Debe coincidir con private.wellness_light() de la base
 * (la base es la que decide al guardar; esto sirve para mostrar el resultado
 * mientras se completa el formulario y para los registros sin conexión).
 *
 *  - Rojo: enfermo, dolor moderado o fuerte, o estado general mínimo.
 *  - Amarillo: dolor leve, molestia anotada, poco sueño, poca energía, mucho
 *    cansancio muscular, pocas ganas, estado bajo o poca hidratación.
 *  - Verde: el resto. Lo no registrado no se asume.
 *  - Sin ningún dato: sin semáforo.
 */
export function wellnessLight(w: WellnessInput): TrafficLight | null {
  const lte = (v: number | null, n: number) => v !== null && v <= n;
  if (w.sick || w.pain_level >= 2 || w.overall === 1) return 'red';
  if (
    w.pain_level === 1 ||
    (w.discomfort ?? '').trim() !== '' ||
    (w.sleep_hours !== null && w.sleep_hours < 8) ||
    lte(w.sleep_quality, 2) ||
    lte(w.energy, 2) ||
    (w.soreness !== null && w.soreness >= 4) ||
    lte(w.motivation, 2) ||
    lte(w.overall, 2) ||
    lte(w.hydration, 2)
  )
    return 'yellow';
  const any = [
    w.sleep_hours,
    w.sleep_quality,
    w.energy,
    w.soreness,
    w.motivation,
    w.overall,
    w.hydration,
  ].some((v) => v !== null);
  return any ? 'green' : null;
}

export const lightInfo: Record<
  TrafficLight,
  { label: string; text: string; dot: string; bg: string }
> = {
  green: { label: 'Verde', text: 'Buen estado general.', dot: 'bg-success', bg: 'bg-success-soft' },
  yellow: {
    label: 'Amarillo',
    text: 'Cansancio, descanso insuficiente o molestias que requieren atención.',
    dot: 'bg-warning-bright',
    bg: 'bg-warning-soft',
  },
  red: {
    label: 'Rojo',
    text: 'Dolor, lesión, enfermedad o malestar importante. Avisá a un adulto y no sigas entrenando hasta evaluar la situación.',
    dot: 'bg-danger',
    bg: 'bg-danger-soft',
  },
};
