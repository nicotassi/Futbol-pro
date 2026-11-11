import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, CircleDashed, CloudOff, Dumbbell } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Sheet } from '@/components/ui/Sheet';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useExercises, type SessionView } from './hooks';
import { fetchSessionResults, trainingKeys, updateSessionWatch } from './api';
import { Button } from '@/components/ui/Button';
import { usePlayer } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { WatchFields } from '@/features/sessionWatch/WatchFields';
import {
  formatWatchData,
  parseWatchForm,
  watchFormFrom,
  type WatchData as WatchDataType,
  type WatchForm,
} from '@/features/sessionWatch/watchData';
import { postStateLabels, relativeDay, rpeLabels } from './format';

export function SessionList({ sessions }: { sessions: SessionView[] }) {
  const [open, setOpen] = useState<SessionView | null>(null);
  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {sessions.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setOpen(s)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:border-gold/50"
            >
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full bg-coal text-gold"
                aria-hidden
              >
                <Dumbbell className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-semibold">{s.title}</span>
                <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                  <span>{relativeDay(new Date(s.started_at))}</span>
                  {s.actual_minutes !== null && <span>{s.actual_minutes} min</span>}
                  {s.rpe !== null && <span>Esfuerzo {s.rpe}/10</span>}
                </span>
              </span>
              {s.pending && (
                <Badge tone="warning">
                  <CloudOff className="size-3" aria-hidden /> Pendiente
                </Badge>
              )}
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.title ?? ''}>
        {open && <SessionDetail session={open} />}
      </Sheet>
    </>
  );
}

function SessionDetail({ session }: { session: SessionView }) {
  const exercises = useExercises();
  const results = useQuery({
    queryKey: trainingKeys.sessionResults(session.id),
    queryFn: () => fetchSessionResults(session.id),
    enabled: !session.pending,
  });
  const names = new Map((exercises.data ?? []).map((e) => [e.id, e.name]));
  return (
    <div className="flex flex-col gap-4 text-sm">
      {session.pending && (
        <p className="rounded-[12px] bg-warning-soft px-3 py-2 text-warning">
          Guardado en el celular. Se envía automáticamente al volver internet.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3">
        <Info label="Fecha" value={relativeDay(new Date(session.started_at))} />
        <Info
          label="Duración"
          value={session.actual_minutes !== null ? `${session.actual_minutes} min` : '—'}
        />
        <Info
          label="Esfuerzo"
          value={session.rpe !== null ? `${session.rpe}/10 · ${rpeLabels[session.rpe]}` : '—'}
        />
        <Info
          label="Cómo terminó"
          value={session.post_state !== null ? postStateLabels[session.post_state]! : '—'}
        />
      </dl>
      {session.notes && <p className="rounded-[12px] bg-sand px-3 py-2">{session.notes}</p>}
      {!session.pending && (
        <div>
          <p className="mb-2 font-semibold">Ejercicios</p>
          {results.isPending ? (
            <LoadingState rows={1} />
          ) : (results.data ?? []).length === 0 ? (
            <p className="text-muted">Entrenamiento libre: sin detalle por ejercicio.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {results.data!.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  {r.completed ? (
                    <CheckCircle2 className="size-4 text-success" aria-label="Completado" />
                  ) : (
                    <CircleDashed className="size-4 text-muted" aria-label="Incompleto" />
                  )}
                  <span className="flex-1">{names.get(r.exercise_id ?? '') ?? 'Ejercicio'}</span>
                  {r.sets_done !== null && (
                    <span className="text-xs text-muted">{r.sets_done} series</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!session.pending && <WatchData session={session} />}
    </div>
  );
}

function WatchData({ session }: { session: SessionView }) {
  const queryClient = useQueryClient();
  const player = usePlayer();
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState<Partial<WatchDataType>>(session);
  const [form, setForm] = useState<WatchForm>(() => watchFormFrom(session));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const rows = formatWatchData(current);

  const save = async () => {
    const parsed = parseWatchForm(form);
    if ('error' in parsed) return setError(parsed.error);
    setSaving(true);
    try {
      await updateSessionWatch(session.id, parsed.data);
      setCurrent(parsed.data);
      await queryClient.invalidateQueries({ queryKey: trainingKeys.sessions(player.id) });
      setEditing(false);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  if (editing)
    return (
      <div className="flex flex-col gap-3">
        <WatchFields form={form} onChange={setForm} />
        {error && (
          <p
            role="alert"
            className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? 'Guardando…' : 'Guardar datos del reloj'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );

  return (
    <div>
      <p className="mb-2 font-semibold">Datos del reloj</p>
      {rows.length === 0 ? (
        <p className="text-muted">Todavía no se cargaron datos del reloj.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-[10px] bg-sand/70 px-3 py-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium tabular">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <Button
        className="mt-3"
        size="sm"
        variant="secondary"
        onClick={() => {
          setForm(watchFormFrom(current));
          setEditing(true);
        }}
      >
        {rows.length === 0 ? 'Cargar datos del reloj' : 'Editar datos del reloj'}
      </Button>
      <p className="mt-2 text-xs text-muted">Estimaciones del reloj, no mediciones clínicas.</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-sand/70 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
