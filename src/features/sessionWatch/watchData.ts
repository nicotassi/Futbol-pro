/** Datos del reloj de un entrenamiento, cargados a mano. Todo es opcional (null = no registrado). */
export interface WatchData {
  hr_avg: number | null;
  hr_max: number | null;
  calories: number | null;
  training_load: number | null;
  aerobic_effect: number | null;
  anaerobic_effect: number | null;
  zone_vo2max_pct: number | null;
  zone_intensive_pct: number | null;
}

export type WatchForm = Record<keyof WatchData, string>;

export const emptyWatchData: WatchData = {
  hr_avg: null,
  hr_max: null,
  calories: null,
  training_load: null,
  aerobic_effect: null,
  anaerobic_effect: null,
  zone_vo2max_pct: null,
  zone_intensive_pct: null,
};

export const emptyWatchForm = (): WatchForm =>
  Object.fromEntries(Object.keys(emptyWatchData).map((k) => [k, ''])) as WatchForm;

export const watchFormFrom = (d: Partial<WatchData>): WatchForm => {
  const f = emptyWatchForm();
  for (const k of Object.keys(f) as (keyof WatchData)[]) f[k] = d[k] == null ? '' : String(d[k]);
  return f;
};

export const hasWatchData = (d: Partial<WatchData>) =>
  Object.values(d).some((v) => v !== null && v !== undefined);

const num = (t: string) => Number(t.trim().replace(',', '.'));

/** Entero entre min y max; vacío = null; undefined = inválido. */
function int(text: string, min: number, max: number): number | null | undefined {
  if (text.trim() === '') return null;
  const n = num(text);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

/** Decimal con a lo sumo un decimal entre min y max. */
function decimal(text: string, min: number, max: number): number | null | undefined {
  if (text.trim() === '') return null;
  if (!/^\d+([.,]\d)?$/.test(text.trim())) return undefined;
  const n = num(text);
  return n >= min && n <= max ? n : undefined;
}

export const watchLabels: Record<keyof WatchData, string> = {
  hr_avg: 'Ritmo cardíaco promedio',
  hr_max: 'Ritmo cardíaco máximo',
  calories: 'Calorías',
  training_load: 'Carga de entrenamiento',
  aerobic_effect: 'Efecto aeróbico',
  anaerobic_effect: 'Efecto anaeróbico',
  zone_vo2max_pct: 'Zona VO2 máx',
  zone_intensive_pct: 'Zona Intensivo',
};

/** Valida lo cargado. Devuelve los datos listos para guardar o un mensaje de error. */
export function parseWatchForm(f: WatchForm): { data: WatchData } | { error: string } {
  const hrAvg = int(f.hr_avg, 30, 250);
  const hrMax = int(f.hr_max, 30, 250);
  const calories = int(f.calories, 0, 10000);
  const load = int(f.training_load, 0, 3000);
  const aer = decimal(f.aerobic_effect, 1, 5);
  const ana = decimal(f.anaerobic_effect, 1, 5);
  const z1 = decimal(f.zone_vo2max_pct, 0, 100);
  const z2 = decimal(f.zone_intensive_pct, 0, 100);

  if (hrAvg === undefined) return { error: `${watchLabels.hr_avg}: un número entre 30 y 250.` };
  if (hrMax === undefined) return { error: `${watchLabels.hr_max}: un número entre 30 y 250.` };
  if (calories === undefined) return { error: 'Calorías: un número entero de 0 a 10000.' };
  if (load === undefined) return { error: 'Carga de entrenamiento: un número entero de 0 a 3000.' };
  if (aer === undefined) return { error: 'Efecto aeróbico: de 1 a 5, con un decimal (ej. 3,4).' };
  if (ana === undefined) return { error: 'Efecto anaeróbico: de 1 a 5, con un decimal (ej. 1,2).' };
  if (z1 === undefined) return { error: 'Zona VO2 máx: un porcentaje de 0 a 100.' };
  if (z2 === undefined) return { error: 'Zona Intensivo: un porcentaje de 0 a 100.' };
  if (hrAvg !== null && hrMax !== null && hrAvg > hrMax)
    return { error: 'El ritmo promedio no puede ser mayor que el máximo.' };
  if ((z1 ?? 0) + (z2 ?? 0) > 100) return { error: 'Las zonas no pueden sumar más de 100 %.' };

  return {
    data: {
      hr_avg: hrAvg,
      hr_max: hrMax,
      calories,
      training_load: load,
      aerobic_effect: aer,
      anaerobic_effect: ana,
      zone_vo2max_pct: z1,
      zone_intensive_pct: z2,
    },
  };
}

/** Texto para mostrar cada dato con su unidad. */
export function formatWatchData(d: Partial<WatchData>): [string, string][] {
  const rows: [string, string][] = [];
  const add = (label: string, v: number | null | undefined, unit = '') => {
    if (v !== null && v !== undefined) rows.push([label, `${String(v).replace('.', ',')}${unit}`]);
  };
  add(watchLabels.hr_avg, d.hr_avg, ' lpm');
  add(watchLabels.hr_max, d.hr_max, ' lpm');
  add(watchLabels.calories, d.calories, ' kcal');
  add(watchLabels.training_load, d.training_load);
  add(watchLabels.aerobic_effect, d.aerobic_effect);
  add(watchLabels.anaerobic_effect, d.anaerobic_effect);
  add(watchLabels.zone_vo2max_pct, d.zone_vo2max_pct, ' %');
  add(watchLabels.zone_intensive_pct, d.zone_intensive_pct, ' %');
  return rows;
}
