import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  CloudOff,
  Dumbbell,
  Pencil,
  Trash2,
} from 'lucide-react';
import { discardOutboxItem } from '@/services/outbox';
import { Badge } from '@/components/ui/Badge';
import { Sheet } from '@/components/ui/Sheet';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useExercises, type SessionView } from './hooks';
import {
  deleteSession,
  fetchSessionResults,
  setResultCompleted,
  trainingKeys,
  updateSession,
  type SessionPatch,
  type SessionResult,
} from './api';
import { buildSessionPatch, type SessionEditForm } from './sessionEdit';
import { ScalePicker } from './ScalePicker';
import { Input, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { usePlayer } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { WatchFields } from '@/features/sessionWatch/WatchFields';
import {
  formatWatchData,
  watchFormFrom,
  type WatchData as WatchDataType,
} from '@/features/sessionWatch/watchData';
import { postStateLabels, relativeDay, rpeLabels } from './format';

export function SessionList({
  sessions,
  isAdmin = false,
}: {
  sessions: SessionView[];
  isAdmin?: boolean;
}) {
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
        {open && <SessionDetail session={open} isAdmin={isAdmin} onDeleted={() => setOpen(null)} />}
      </Sheet>
    </>
  );
}

function SessionDetail({
  session: initial,
  isAdmin,
  onDeleted,
}: {
  session: SessionView;
  isAdmin: boolean;
  onDeleted: () => void;
}) {
  const [session, setSession] = useState<SessionView>(initial);
  const [editing, setEditing] = useState(false);
  const exercises = useExercises();
  const results = useQuery({
    queryKey: trainingKeys.sessionResults(session.id),
    queryFn: () => fetchSessionResults(session.id),
    enabled: !session.pending,
  });
  const names = new Map((exercises.data ?? []).map((e) => [e.id, e.name]));

  if (editing)
    return (
      <SessionEditor
        session={session}
        results={results.data ?? []}
        names={names}
        onCancel={() => setEditing(false)}
        onSaved={(patch) => {
          setSession({ ...session, ...patch });
          setEditing(false);
        }}
      />
    );

  const rows = formatWatchData(session);
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
      {!session.pending && (
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
          <p className="mt-2 text-xs text-muted">Estimaciones del reloj, no mediciones clínicas.</p>
        </div>
      )}
      {!session.pending && (
        <Button
          variant="secondary"
          onClick={() => setEditing(true)}
          leadingIcon={<Pencil className="size-4" />}
        >
          Editar entrenamiento
        </Button>
      )}
      {isAdmin && <DeleteSession session={session} onDeleted={onDeleted} />}
    </div>
  );
}

/** Eliminar una sesión (solo papá), con confirmación. Es definitivo. */
function DeleteSession({ session, onDeleted }: { session: SessionView; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const player = usePlayer();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      if (session.pending) await discardOutboxItem(session.id.replace(/^pendiente-/, ''));
      else await deleteSession(session.id);
      await queryClient.invalidateQueries({ queryKey: trainingKeys.sessions(player.id) });
      onDeleted();
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  };

  if (!confirming)
    return (
      <Button
        variant="ghost"
        onClick={() => setConfirming(true)}
        leadingIcon={<Trash2 className="size-4" />}
      >
        {session.pending ? 'Descartar entrenamiento' : 'Eliminar entrenamiento'}
      </Button>
    );
  return (
    <div
      role="alertdialog"
      aria-label="Confirmar eliminación"
      className="rounded-[14px] border border-danger/40 bg-danger-soft p-3"
    >
      <p className="font-medium text-danger">¿Eliminar “{session.title}”?</p>
      <p className="mt-1 text-xs text-danger">
        Se borra definitivamente, con sus ejercicios y datos del reloj. No se puede deshacer.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove()}>
          {busy ? 'Eliminando…' : 'Sí, eliminar'}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
          No, volver
        </Button>
      </div>
    </div>
  );
}

/** Editar una sesión ya registrada: datos, ejercicios completados y datos del reloj. */
function SessionEditor({
  session,
  results,
  names,
  onCancel,
  onSaved,
}: {
  session: SessionView;
  results: SessionResult[];
  names: Map<string, string>;
  onCancel: () => void;
  onSaved: (patch: SessionPatch & WatchDataType) => void;
}) {
  const queryClient = useQueryClient();
  const player = usePlayer();
  const [form, setForm] = useState<SessionEditForm>(() => ({
    title: session.title,
    date: format(new Date(session.started_at), 'yyyy-MM-dd'),
    minutes: session.actual_minutes === null ? '' : String(session.actual_minutes),
    rpe: session.rpe,
    postState: session.post_state,
    notes: session.notes ?? '',
    watch: watchFormFrom(session),
  }));
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(results.map((r) => [r.id, r.completed])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof SessionEditForm>(k: K, v: SessionEditForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const r = buildSessionPatch(form, session, format(new Date(), 'yyyy-MM-dd'));
    if ('error' in r) return setError(r.error);
    setSaving(true);
    try {
      await updateSession(session.id, r.patch);
      for (const res of results)
        if (done[res.id] !== res.completed) await setResultCompleted(res.id, done[res.id]!);
      await queryClient.invalidateQueries({ queryKey: trainingKeys.sessions(player.id) });
      await queryClient.invalidateQueries({ queryKey: trainingKeys.sessionResults(session.id) });
      onSaved(r.patch);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-4"
    >
      <Input label="Nombre" value={form.title} onChange={(e) => set('title', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fecha"
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
        />
        <Input
          label="Minutos"
          inputMode="numeric"
          value={form.minutes}
          onChange={(e) => set('minutes', e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Ejercicios completados</legend>
          <ul className="flex flex-col gap-1">
            {results.map((r) => (
              <li key={r.id}>
                <label className="flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-sand/60">
                  <input
                    type="checkbox"
                    checked={done[r.id] ?? false}
                    onChange={(e) => setDone((d) => ({ ...d, [r.id]: e.target.checked }))}
                    className="size-5 accent-[var(--color-gold-strong)]"
                  />
                  <span className="flex-1 text-sm">
                    {names.get(r.exercise_id ?? '') ?? 'Ejercicio'}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <ScalePicker
        label="Esfuerzo percibido"
        min={1}
        max={10}
        value={form.rpe}
        onChange={(v) => set('rpe', v)}
        labels={rpeLabels}
      />
      <ScalePicker
        label="¿Cómo terminaste?"
        min={1}
        max={5}
        value={form.postState}
        onChange={(v) => set('postState', v)}
        labels={postStateLabels}
      />
      <Textarea
        label="Observaciones"
        rows={2}
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
      />
      <WatchFields form={form.watch} onChange={(w) => set('watch', w)} />
      {error && (
        <p
          role="alert"
          className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
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
