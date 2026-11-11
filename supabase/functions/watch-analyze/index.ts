/**
 * FUTBOLISTA PRO · Edge Function "watch-analyze"
 *
 * Lee capturas del reloj ya subidas (bucket privado) con Claude y guarda las
 * métricas como "pendientes de revisión". Solo papá (administrador del jugador)
 * puede llamarla. La clave de Anthropic vive como secreto de Supabase
 * (ANTHROPIC_API_KEY); nunca llega al navegador ni al repositorio.
 *
 * Body: { upload_ids: string[] }
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { isValidUploadPath, normalizeMetrics, SYSTEM_PROMPT, TOOL } from './logic.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function analyzeImage(apiKey: string, model: string, mediaType: string, data: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: 'Extraé las métricas visibles de esta captura.' },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}.`);
  const json = await res.json();
  const block = (json.content ?? []).find((b: { type: string }) => b.type === 'tool_use');
  return normalizeMetrics(block?.input);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { ok: false, error: 'Método no permitido.' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey)
    return reply(500, { ok: false, error: 'Falta configuración de Supabase.' });
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Identidad: solo papá.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = token ? await db.auth.getUser(token) : { data: { user: null } };
  if (!userData.user) return reply(401, { ok: false, error: 'Iniciá sesión.' });

  let ids: string[];
  try {
    const body = await req.json();
    ids = Array.isArray(body.upload_ids)
      ? body.upload_ids.filter((x: unknown) => typeof x === 'string').slice(0, 10)
      : [];
  } catch {
    return reply(400, { ok: false, error: 'Pedido inválido.' });
  }
  if (ids.length === 0) return reply(400, { ok: false, error: 'No hay capturas para analizar.' });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const model = Deno.env.get('WATCH_AI_MODEL') ?? 'claude-sonnet-5-5';

  const { data: uploads } = await db.from('watch_uploads').select('*').in('id', ids);
  const results: { upload_id: string; status: string; count?: number; error?: string }[] = [];

  for (const up of uploads ?? []) {
    const { data: access } = await db
      .from('player_access')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('player_id', up.player_id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!access || !isValidUploadPath(up.image_path, up.player_id)) {
      results.push({ upload_id: up.id, status: 'forbidden', error: 'Sin permiso.' });
      continue;
    }
    if (!apiKey) {
      await db
        .from('watch_uploads')
        .update({
          processing_status: 'failed',
          processing_error: 'Falta configurar la clave de IA.',
        })
        .eq('id', up.id);
      results.push({
        upload_id: up.id,
        status: 'failed',
        error: 'Falta configurar la clave de IA en Supabase.',
      });
      continue;
    }
    try {
      await db
        .from('watch_uploads')
        .update({ processing_status: 'processing', processing_error: null })
        .eq('id', up.id);
      const { data: file, error } = await db.storage
        .from('watch-screenshots')
        .download(up.image_path);
      if (error || !file) throw new Error('No se pudo leer la imagen.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const metrics = await analyzeImage(
        apiKey,
        model,
        file.type || 'image/jpeg',
        bytesToBase64(bytes),
      );

      // Reintentos: las métricas pendientes anteriores de esta captura se reemplazan (se marcan descartadas).
      await db
        .from('watch_metrics')
        .update({ validation_status: 'rejected' })
        .eq('upload_id', up.id)
        .eq('validation_status', 'pending');
      if (metrics.length > 0) {
        const { error: insErr } = await db.from('watch_metrics').insert(
          metrics.map((m) => ({
            upload_id: up.id,
            player_id: up.player_id,
            workout_session_id: up.workout_session_id,
            metric_type: m.metric_type,
            metric_value: m.value,
            metric_unit: m.unit,
            source: m.source,
            confidence: m.confidence,
            validation_status: 'pending',
          })),
        );
        if (insErr) throw insErr;
      }
      await db
        .from('watch_uploads')
        .update({
          processing_status: 'done',
          extracted_data: { metrics },
          review_status: 'pending',
        })
        .eq('id', up.id);
      results.push({ upload_id: up.id, status: 'done', count: metrics.length });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al analizar.';
      await db
        .from('watch_uploads')
        .update({ processing_status: 'failed', processing_error: message })
        .eq('id', up.id);
      results.push({ upload_id: up.id, status: 'failed', error: message });
    }
  }
  return reply(200, { ok: true, results });
});
