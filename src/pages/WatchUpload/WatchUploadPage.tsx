import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Info, Pencil, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePlayer } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { useSessions } from '@/features/training/hooks';
import { relativeDay } from '@/features/training/format';
import {
  addManualMetric,
  analyzeUploads,
  fetchMetrics,
  fetchUploads,
  retryAnalysis,
  metricLabels,
  reviewMetric,
  uploadCapture,
  watchKeys,
  type MetricType,
  type WatchMetric,
} from '@/features/watch/api';
import { compressImage, sha256Hex } from '@/features/watch/image';

const LOW_CONFIDENCE = 0.6;
const statusBadge = {
  pending: { tone: 'warning', label: 'Pendiente de revisión' },
  confirmed: { tone: 'success', label: 'Confirmado' },
  corrected: { tone: 'gold', label: 'Corregido' },
  rejected: { tone: 'neutral', label: 'Descartado' },
} as const;

export default function WatchUploadPage() {
  useDocumentTitle('Registro del reloj');
  const player = usePlayer();
  const queryClient = useQueryClient();
  const sessions = useSessions();
  const real = (sessions.data ?? []).filter((s) => !s.pending);
  const [sessionId, setSessionId] = useState('');
  const current = sessionId || real[0]?.id || '';
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [manualType, setManualType] = useState<MetricType>('heart_rate_avg');
  const [manualValue, setManualValue] = useState('');

  const metrics = useQuery({
    queryKey: watchKeys.metrics(player.id),
    queryFn: () => fetchMetrics(player.id),
    refetchOnMount: 'always',
  });
  const uploads = useQuery({
    queryKey: watchKeys.uploads(player.id),
    queryFn: () => fetchUploads(player.id),
    refetchOnMount: 'always',
  });
  const failed = (uploads.data ?? []).filter(
    (u) => u.workout_session_id === current && u.processing_status === 'failed',
  );
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: watchKeys.metrics(player.id) });
    await queryClient.invalidateQueries({ queryKey: watchKeys.uploads(player.id) });
  };
  const forSession = (metrics.data ?? []).filter(
    (m) => m.workout_session_id === current && m.validation_status !== 'rejected',
  );
  const pending = forSession.filter((m) => m.validation_status === 'pending');
  const official = forSession.filter((m) => m.validation_status !== 'pending');

  const guard = async (fn: () => Promise<void>) => {
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ tone: 'error', text: friendlyError(e) });
    }
  };

  const onFiles = (files: FileList | null) =>
    guard(async () => {
      if (!files || files.length === 0 || !current) return;
      setBusy(true);
      try {
        const ids: string[] = [];
        const errors: string[] = [];
        for (const file of [...files].slice(0, 6)) {
          try {
            const blob = await compressImage(file);
            ids.push(
              await uploadCapture({
                playerId: player.id,
                sessionId: current,
                blob,
                sha256: await sha256Hex(blob),
                originalName: file.name,
              }),
            );
          } catch (e) {
            errors.push(`${file.name}: ${friendlyError(e)}`);
          }
        }
        if (ids.length > 0) {
          const res = await analyzeUploads(ids);
          const failed = res.results?.find((r) => r.status === 'failed');
          const total = (res.results ?? []).reduce((n, r) => n + (r.count ?? 0), 0);
          if (!res.ok || failed)
            errors.push(
              (failed?.error ?? res.error ?? 'No se pudo analizar.') +
                ' Las capturas quedaron guardadas: podés cargar los datos a mano abajo.',
            );
          else
            setMessage({
              tone: 'ok',
              text: `${total} dato(s) extraído(s). Revisalos antes de que cuenten.`,
            });
        }
        if (errors.length) setMessage({ tone: 'error', text: errors.join(' · ') });
        await refresh();
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    });

  const review = (m: WatchMetric, action: 'confirm' | 'correct' | 'reject', value?: string) =>
    guard(async () => {
      await reviewMetric(m.id, action, value);
      await refresh();
    });

  return (
    <>
      <TopBar title="Registro del reloj" />
      <PageHeader
        eyebrow="Función prioritaria"
        title="Registro del reloj"
        description="Convertí las capturas del reloj en datos del entrenamiento, siempre con revisión humana."
      />

      {real.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            title="Primero registrá un entrenamiento"
            description="Las capturas se asocian a una sesión. Registrá una desde Entrenar."
          />
        </Card>
      ) : (
        <>
          <Card className="mt-4">
            <Select label="Sesión" value={current} onChange={(e) => setSessionId(e.target.value)}>
              {real.slice(0, 40).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · {relativeDay(new Date(s.started_at))}
                </option>
              ))}
            </Select>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              aria-label="Elegir imágenes"
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button
              className="mt-3"
              block
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              leadingIcon={<UploadCloud className="size-4" />}
            >
              {busy ? 'Subiendo y analizando…' : 'Subir capturas'}
            </Button>
            <p className="mt-2 text-xs text-muted">
              PNG o JPG · hasta 6 por vez. Se comprimen en el celular y se guardan en privado.
            </p>
          </Card>

          {message && (
            <p
              role={message.tone === 'error' ? 'alert' : 'status'}
              className={`mt-3 rounded-[12px] px-3 py-2 text-sm font-medium ${message.tone === 'error' ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}`}
            >
              {message.text}
            </p>
          )}

          {failed.length > 0 && (
            <Section title="Capturas sin analizar">
              <ul className="flex flex-col gap-2.5">
                {failed.map((u) => (
                  <li key={u.id}>
                    <Card>
                      <p className="text-sm font-medium">{u.original_filename ?? 'Captura'}</p>
                      <p className="mt-0.5 text-xs text-danger">{u.processing_error}</p>
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void guard(async () => {
                            setBusy(true);
                            try {
                              const res = await retryAnalysis(u.id);
                              const bad = res.results?.find((r) => r.status === 'failed');
                              if (!res.ok || bad)
                                setMessage({
                                  tone: 'error',
                                  text: bad?.error ?? res.error ?? 'No se pudo analizar.',
                                });
                              else
                                setMessage({
                                  tone: 'ok',
                                  text: 'Listo: revisá los datos extraídos.',
                                });
                              await refresh();
                            } finally {
                              setBusy(false);
                            }
                          })
                        }
                      >
                        Reintentar análisis
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Para revisar">
            {pending.length === 0 ? (
              <p className="text-sm text-muted">
                No hay datos pendientes de revisión en esta sesión.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {pending.map((m) => (
                  <PendingRow key={m.id} metric={m} onReview={(a, v) => void review(m, a, v)} />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Datos oficiales de la sesión">
            {official.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay datos confirmados.</p>
            ) : (
              <Card padded={false}>
                <ul className="divide-y divide-line text-sm">
                  {official.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span>{metricLabels[m.metric_type].label}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular">
                          {m.confirmed_value} {m.metric_unit ?? ''}
                        </span>
                        <Badge tone={statusBadge[m.validation_status].tone}>
                          {m.source === 'Manual'
                            ? 'Manual'
                            : statusBadge[m.validation_status].label}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>

          <Section title="Cargar un dato a mano">
            <Card>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Dato"
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as MetricType)}
                >
                  {Object.entries(metricLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Valor"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                />
              </div>
              <Button
                className="mt-3"
                variant="secondary"
                disabled={manualValue.trim() === ''}
                onClick={() =>
                  void guard(async () => {
                    await addManualMetric({
                      playerId: player.id,
                      sessionId: current,
                      type: manualType,
                      value: manualValue,
                      unit: metricLabels[manualType].unit,
                    });
                    setManualValue('');
                    await refresh();
                  })
                }
              >
                Guardar dato
              </Button>
            </Card>
          </Section>
        </>
      )}

      <div className="mt-7 flex flex-col gap-2 text-xs text-muted">
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Los datos del reloj son estimaciones del dispositivo, no mediciones clínicas.
        </p>
        <p className="flex gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Las imágenes se guardan en almacenamiento privado. La IA solo lee lo visible y nada cuenta
          en las estadísticas hasta que papá lo confirma.
        </p>
      </div>
    </>
  );
}

function PendingRow({
  metric: m,
  onReview,
}: {
  metric: WatchMetric;
  onReview: (action: 'confirm' | 'correct' | 'reject', value?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(m.metric_value);
  const low = (m.confidence ?? 0) < LOW_CONFIDENCE;
  return (
    <li>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{metricLabels[m.metric_type].label}</p>
            <p className="text-xs text-muted">
              {m.source ?? 'Captura'} · confianza {Math.round((m.confidence ?? 0) * 100)}%
            </p>
          </div>
          <p className="font-display text-lg font-semibold tabular">
            {m.metric_value} <span className="text-sm text-muted">{m.metric_unit ?? ''}</span>
          </p>
        </div>
        {low && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
            <AlertTriangle className="size-3.5" aria-hidden />
            Requiere revisión manual
          </p>
        )}
        {editing ? (
          <div className="mt-3 flex items-end gap-2">
            <Input
              label="Valor correcto"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button size="sm" onClick={() => onReview('correct', value)}>
              Guardar
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onReview('confirm')}
              leadingIcon={<Check className="size-4" />}
            >
              Confirmar {metricLabels[m.metric_type].label}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(true)}
              leadingIcon={<Pencil className="size-4" />}
            >
              Corregir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReview('reject')}
              leadingIcon={<X className="size-4" />}
            >
              Descartar
            </Button>
          </div>
        )}
      </Card>
    </li>
  );
}
