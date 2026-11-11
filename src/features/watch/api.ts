import { db } from '@/services/supabase';
import type { Enums, Tables } from '@/types/database';

export type WatchUpload = Tables<'watch_uploads'>;
export type WatchMetric = Tables<'watch_metrics'>;
export type MetricType = Enums<'watch_metric_type'>;

export const watchKeys = {
  uploads: (playerId: string) => ['watch-uploads', playerId] as const,
  metrics: (playerId: string) => ['watch-metrics', playerId] as const,
};

export const metricLabels: Record<MetricType, { label: string; unit: string }> = {
  duration: { label: 'Duración', unit: 'min' },
  heart_rate_avg: { label: 'FC promedio', unit: 'lpm' },
  heart_rate_max: { label: 'FC máxima', unit: 'lpm' },
  hr_zone_1: { label: 'Zona 1 (tiempo)', unit: 'min' },
  hr_zone_2: { label: 'Zona 2 (tiempo)', unit: 'min' },
  hr_zone_3: { label: 'Zona 3 (tiempo)', unit: 'min' },
  hr_zone_4: { label: 'Zona 4 (tiempo)', unit: 'min' },
  hr_zone_5: { label: 'Zona 5 (tiempo)', unit: 'min' },
  calories: { label: 'Calorías', unit: 'kcal' },
  distance: { label: 'Distancia', unit: 'km' },
  speed_avg: { label: 'Velocidad promedio', unit: 'km/h' },
  speed_max: { label: 'Velocidad máxima', unit: 'km/h' },
  pace_avg: { label: 'Ritmo promedio', unit: 'min/km' },
  steps: { label: 'Pasos', unit: '' },
  activity_datetime: { label: 'Fecha y hora', unit: '' },
  activity_type: { label: 'Tipo de actividad', unit: '' },
};

export async function fetchUploads(playerId: string): Promise<WatchUpload[]> {
  const { data, error } = await db()
    .from('watch_uploads')
    .select('*')
    .eq('player_id', playerId)
    .order('uploaded_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function fetchMetrics(playerId: string): Promise<WatchMetric[]> {
  const { data, error } = await db()
    .from('watch_metrics')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data;
}

/** Sube una imagen al almacenamiento privado y registra la captura. Devuelve su id. */
export async function uploadCapture(opts: {
  playerId: string;
  sessionId: string;
  blob: Blob;
  sha256: string;
  originalName: string;
}): Promise<string> {
  const client = db();
  const path = `${opts.playerId}/${opts.sessionId}/${opts.sha256}.jpg`;
  const { error: upErr } = await client.storage
    .from('watch-screenshots')
    .upload(path, opts.blob, { contentType: 'image/jpeg', upsert: false });
  // Si ya estaba subida (misma imagen), seguimos: el registro es único por sesión y huella.
  if (upErr && !/exists|duplicate/i.test(upErr.message ?? '')) throw upErr;
  const { data, error } = await client
    .from('watch_uploads')
    .insert({
      player_id: opts.playerId,
      workout_session_id: opts.sessionId,
      image_path: path,
      original_filename: opts.originalName.slice(0, 200),
      image_sha256: opts.sha256,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      // Ya estaba cargada: se reutiliza para poder volver a analizarla.
      const { data: existing } = await client
        .from('watch_uploads')
        .select('id')
        .eq('workout_session_id', opts.sessionId)
        .eq('image_sha256', opts.sha256)
        .single();
      if (existing) return existing.id;
      throw new Error('Esa captura ya estaba cargada en esta sesión.');
    }
    throw error;
  }
  return data.id;
}

export interface AnalyzeResult {
  ok: boolean;
  error?: string;
  results?: { upload_id: string; status: string; count?: number; error?: string }[];
}

export async function analyzeUploads(uploadIds: string[]): Promise<AnalyzeResult> {
  const { data, error } = await db().functions.invoke('watch-analyze', {
    body: { upload_ids: uploadIds },
  });
  if (error) return { ok: false, error: 'No se pudo contactar el análisis con IA.' };
  return data as AnalyzeResult;
}

export async function reviewMetric(
  id: string,
  action: 'confirm' | 'correct' | 'reject',
  value?: string,
) {
  const { error } = await db().rpc('review_watch_metric', {
    p_id: id,
    p_action: action,
    p_value: value ?? '',
  });
  if (error) throw error;
}

export async function addManualMetric(opts: {
  playerId: string;
  sessionId: string;
  type: MetricType;
  value: string;
  unit: string;
}) {
  const { error } = await db().rpc('add_watch_metric', {
    p_player: opts.playerId,
    p_session: opts.sessionId,
    p_type: opts.type,
    p_value: opts.value,
    p_unit: opts.unit,
  });
  if (error) throw error;
}

/** Datos del reloj ya revisados por papá (los únicos que cuentan). */
export async function fetchConfirmedMetrics(sessionId: string): Promise<WatchMetric[]> {
  const { data, error } = await db()
    .from('watch_metrics')
    .select('*')
    .eq('workout_session_id', sessionId)
    .in('validation_status', ['confirmed', 'corrected'])
    .order('metric_type');
  if (error) throw error;
  return data;
}

/** Vuelve a analizar una captura que falló. */
export const retryAnalysis = (uploadId: string) => analyzeUploads([uploadId]);
