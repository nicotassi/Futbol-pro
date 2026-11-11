import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  X,
} from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { Input, Textarea } from '@/components/ui/Field';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SplashScreen } from '@/features/auth/SplashScreen';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useStopwatch } from '@/hooks/useStopwatch';
import { friendlyError } from '@/services/errors';
import { enqueueSession } from '@/services/outbox';
import { formatClock } from '@/utils/date';
import { cn } from '@/utils/cn';
import { useExercises } from '@/features/training/hooks';
import { fetchWorkout, trainingKeys } from '@/features/training/api';
import {
  buildSessionPayload,
  clearActiveSession,
  completeSet,
  createActiveSession,
  elapsedMinutes,
  goTo,
  loadActiveSession,
  saveActiveSession,
  skipRest,
  targetSets,
  toggleCompleted,
  type ActiveSession,
} from '@/features/training/activeSession';
import { ScalePicker } from '@/features/training/ScalePicker';
import { postStateLabels, rpeLabels } from '@/features/training/format';

/** Modo entrenamiento: un ejercicio por pantalla. El progreso se guarda en el celular. */
export default function TrainingModePage() {
  const { sessionId: workoutId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const player = usePlayer();
  const exercises = useExercises();
  const workout = useQuery({
    queryKey: trainingKeys.workout(workoutId),
    queryFn: () => fetchWorkout(workoutId),
  });
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [conflict, setConflict] = useState<ActiveSession | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState<'online' | 'offline' | null>(null);
  useDocumentTitle(session?.title ?? 'Modo entrenamiento');

  // Retomar la sesión guardada o empezar una nueva.
  useEffect(() => {
    if (session || conflict || !workout.data || !exercises.data || !user) return;
    void loadActiveSession().then((saved) => {
      if (saved && saved.workoutId === workoutId && saved.playerId === player.id) setSession(saved);
      else if (saved && saved.playerId === player.id) setConflict(saved);
      else
        setSession(
          createActiveSession(workout.data, exercises.data, {
            clientId: crypto.randomUUID(),
            userId: user.id,
            playerId: player.id,
          }),
        );
    });
  }, [session, conflict, workout.data, exercises.data, user, player.id, workoutId]);

  // Guardado automático en cada cambio.
  const update = useCallback((next: ActiveSession) => {
    setSession(next);
    void saveActiveSession(next);
  }, []);

  if (done)
    return (
      <DoneScreen mode={done} onClose={() => navigate('/entrenar/historial', { replace: true })} />
    );
  if (workout.isError) {
    return (
      <div className="mx-auto max-w-md px-6 pt-20">
        <ErrorState
          title="No se pudo abrir el entrenamiento"
          description={friendlyError(workout.error)}
          onRetry={() => void workout.refetch()}
        />
      </div>
    );
  }
  if (conflict) {
    return (
      <ConflictScreen
        other={conflict}
        onContinueOther={() =>
          navigate(`/entrenar/sesion/${conflict.workoutId}`, { replace: true })
        }
        onDiscard={async () => {
          await clearActiveSession();
          setConflict(null);
        }}
      />
    );
  }
  if (!session) return <SplashScreen />;

  return (
    <ActiveView
      session={session}
      update={update}
      onExit={() => navigate('/entrenar')}
      finishing={finishing}
      setFinishing={setFinishing}
      onSaved={(mode) => setDone(mode)}
    />
  );
}

function ActiveView({
  session,
  update,
  onExit,
  finishing,
  setFinishing,
  onSaved,
}: {
  session: ActiveSession;
  update: (s: ActiveSession) => void;
  onExit: () => void;
  finishing: boolean;
  setFinishing: (v: boolean) => void;
  onSaved: (mode: 'online' | 'offline') => void;
}) {
  const item = session.items[session.index]!;
  const watch = useStopwatch();
  const { reset } = watch;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    reset();
  }, [session.index, reset]);

  // Reloj para el descanso.
  useEffect(() => {
    if (!session.restEndsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [session.restEndsAt]);

  const restLeft = session.restEndsAt ? Math.ceil((session.restEndsAt - now) / 1000) : 0;
  useEffect(() => {
    if (session.restEndsAt && restLeft <= 0) {
      navigator.vibrate?.(300);
      update(skipRest(session));
    }
  }, [restLeft, session, update]);

  const target = item.durationSec;
  const remaining = target ? target - watch.elapsedSeconds : null;
  const timeUp = remaining !== null && remaining <= 0;
  useEffect(() => {
    if (timeUp && watch.running) navigator.vibrate?.([200, 100, 200]);
  }, [timeUp, watch.running]);

  const total = targetSets(item);
  const completedCount = session.items.filter((i) => i.completed).length;

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-paper">
      <header className="mx-auto flex w-full max-w-xl items-center gap-2 px-3 pt-3 pt-safe">
        <IconButton
          tone="dark"
          label="Salir (el progreso queda guardado)"
          icon={<X className="size-6" />}
          onClick={onExit}
        />
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-sm font-semibold">{session.title}</p>
          <p className="text-xs text-fog">
            Ejercicio {session.index + 1} de {session.items.length} · {completedCount} completados
          </p>
        </div>
        <IconButton
          tone="dark"
          label="Finalizar sesión"
          icon={<Square className="size-5" />}
          onClick={() => setFinishing(true)}
        />
      </header>

      <div className="mx-auto mt-3 flex w-full max-w-xl gap-1.5 px-5" aria-hidden>
        {session.items.map((it, i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              it.completed ? 'bg-gold' : i === session.index ? 'bg-gold/60' : 'bg-ink-3',
            )}
          />
        ))}
      </div>

      <main
        key={session.index}
        className="animate-enter mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pt-6 text-center"
      >
        <div className="flex flex-wrap justify-center gap-1.5 text-xs font-semibold">
          {item.sets && (
            <span className="rounded-full bg-ink-2 px-2.5 py-1 text-gold">{item.sets} series</span>
          )}
          {item.reps && (
            <span className="rounded-full bg-ink-2 px-2.5 py-1 text-gold">
              {item.reps} repeticiones
            </span>
          )}
          {item.durationSec && (
            <span className="rounded-full bg-ink-2 px-2.5 py-1 text-gold">
              {formatClock(item.durationSec)}
            </span>
          )}
          {item.restSec ? (
            <span className="rounded-full bg-ink-2 px-2.5 py-1 text-fog">
              Descanso {item.restSec} s
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-3xl leading-tight font-semibold">{item.name}</h1>
        {item.objective && <p className="mt-2 max-w-sm text-sm text-fog">{item.objective}</p>}
        {item.instructions && (
          <p className="mt-3 max-w-sm rounded-[12px] bg-ink-2 px-3 py-2 text-sm text-gold-light">
            {item.instructions}
          </p>
        )}

        {session.restEndsAt ? (
          <div className="mt-8 flex flex-col items-center gap-3" role="timer" aria-live="polite">
            <p className="eyebrow text-gold">Descanso</p>
            <p className="tabular font-display text-6xl font-semibold">
              {formatClock(Math.max(0, restLeft))}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => update(skipRest(session))}
              leadingIcon={<SkipForward className="size-4" />}
            >
              Saltar descanso
            </Button>
          </div>
        ) : (
          <ProgressRing
            value={target ? Math.min(100, (watch.elapsedSeconds / target) * 100) : 0}
            label="Tiempo del ejercicio"
            size={176}
            stroke={8}
            tone="dark"
            className="mt-8"
          >
            <div>
              <p
                className={cn('tabular font-display text-4xl font-semibold', timeUp && 'text-gold')}
              >
                {remaining !== null
                  ? formatClock(Math.abs(remaining))
                  : formatClock(watch.elapsedSeconds)}
              </p>
              <p className="text-xs text-fog">
                {remaining === null ? 'cronómetro' : timeUp ? '¡tiempo!' : 'restante'}
              </p>
            </div>
          </ProgressRing>
        )}

        {item.steps.length > 0 && (
          <details className="mt-6 w-full max-w-sm rounded-[14px] bg-ink-2 px-4 py-3 text-left text-sm">
            <summary className="cursor-pointer font-semibold text-gold">Cómo se hace</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-fog">
              {item.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </details>
        )}
      </main>

      <footer className="mx-auto w-full max-w-xl px-5 pt-4 pb-6 pb-safe">
        <Button
          size="lg"
          block
          variant={item.completed ? 'secondary' : 'accent'}
          disabled={Boolean(session.restEndsAt)}
          onClick={() => {
            if (item.completed) update(toggleCompleted(session, session.index));
            else {
              watch.pause();
              update(completeSet(session));
            }
          }}
          leadingIcon={
            item.completed ? <CircleCheck className="size-5" /> : <Check className="size-5" />
          }
        >
          {item.completed
            ? 'Completado (tocar para deshacer)'
            : total > 1
              ? `Serie hecha (${item.setsDone + 1} de ${total})`
              : 'Ejercicio hecho'}
        </Button>
        <div className="mt-4 flex items-center justify-between">
          <IconButton
            tone="dark"
            size="lg"
            label="Ejercicio anterior"
            icon={<ChevronLeft className="size-7" />}
            disabled={session.index === 0}
            onClick={() => update(goTo(session, session.index - 1))}
          />
          <IconButton
            tone="dark"
            size="lg"
            label="Reiniciar cronómetro"
            icon={<RotateCcw className="size-6" />}
            onClick={watch.reset}
          />
          <button
            type="button"
            onClick={watch.running ? watch.pause : watch.start}
            aria-label={watch.running ? 'Pausar' : 'Iniciar cronómetro'}
            className="grid size-20 place-items-center rounded-full bg-gold text-ink shadow-[var(--shadow-float)] transition-transform active:scale-95"
          >
            {watch.running ? (
              <Pause className="size-8" fill="currentColor" />
            ) : (
              <Play className="ml-1 size-8" fill="currentColor" />
            )}
          </button>
          <span className="size-14" aria-hidden />
          {session.index === session.items.length - 1 ? (
            <IconButton
              tone="dark"
              size="lg"
              label="Terminar"
              icon={<CircleCheck className="size-7 text-gold" />}
              onClick={() => setFinishing(true)}
            />
          ) : (
            <IconButton
              tone="dark"
              size="lg"
              label="Ejercicio siguiente"
              icon={<ChevronRight className="size-7" />}
              onClick={() => update(goTo(session, session.index + 1))}
            />
          )}
        </div>
      </footer>

      {finishing && (
        <FinishSheet
          session={session}
          update={update}
          onClose={() => setFinishing(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function FinishSheet({
  session,
  update,
  onClose,
  onSaved,
}: {
  session: ActiveSession;
  update: (s: ActiveSession) => void;
  onClose: () => void;
  onSaved: (mode: 'online' | 'offline') => void;
}) {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(() => String(elapsedMinutes(session)));
  const [rpe, setRpe] = useState<number | null>(null);
  const [postState, setPostState] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const mins = Number(minutes);
    if (!Number.isInteger(mins) || mins < 1 || mins > 600) {
      setError('La duración debe ser un número de minutos entre 1 y 600.');
      return;
    }
    setSaving(true);
    const payload = buildSessionPayload(session, { actualMinutes: mins, rpe, postState, notes });
    await enqueueSession(session.userId, payload);
    await clearActiveSession();
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    onSaved(navigator.onLine ? 'online' : 'offline');
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Terminar entrenamiento"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose}>
            Seguir entrenando
          </Button>
          <Button block disabled={saving} onClick={() => void save()}>
            {saving ? 'Guardando…' : 'Guardar sesión'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Duración real (minutos)"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Ejercicios completados</legend>
          <ul className="flex flex-col gap-1">
            {session.items.map((it, i) => (
              <li key={i}>
                <label className="flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-sand/60">
                  <input
                    type="checkbox"
                    checked={it.completed}
                    onChange={() => update(toggleCompleted(session, i))}
                    className="size-5 accent-[var(--color-gold-strong)]"
                  />
                  <span className="flex-1 text-sm">{it.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <ScalePicker
          label="Esfuerzo percibido"
          min={1}
          max={10}
          value={rpe}
          onChange={setRpe}
          labels={rpeLabels}
        />
        <ScalePicker
          label="¿Cómo terminaste?"
          min={1}
          max={5}
          value={postState}
          onChange={setPostState}
          labels={postStateLabels}
        />
        <Textarea
          label="Observaciones"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="¿Qué salió bien? ¿Qué costó?"
        />
        {error && (
          <p
            role="alert"
            className="rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}

function DoneScreen({ mode, onClose }: { mode: 'online' | 'offline'; onClose: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink px-6 text-center text-paper">
      <span className="grid size-20 place-items-center rounded-full bg-gold text-ink" aria-hidden>
        <Check className="size-10" />
      </span>
      <h1 className="text-2xl font-semibold">¡Sesión registrada!</h1>
      <p className="max-w-xs text-sm text-fog">
        {mode === 'online'
          ? 'Quedó guardada en tu historial.'
          : 'Quedó guardada en el celular y se va a enviar sola cuando vuelva internet.'}
      </p>
      <Button variant="accent" onClick={onClose}>
        Ver historial
      </Button>
    </div>
  );
}

function ConflictScreen({
  other,
  onContinueOther,
  onDiscard,
}: {
  other: ActiveSession;
  onContinueOther: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-paper">
      <h1 className="text-xl font-semibold">Tenés otro entrenamiento sin terminar</h1>
      <p className="max-w-xs text-sm text-fog">
        “{other.title}” quedó guardado en el ejercicio {other.index + 1} de {other.items.length}.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button variant="accent" onClick={onContinueOther}>
          Continuar “{other.title}”
        </Button>
        <Button variant="ghost" className="text-paper hover:bg-ink-2" onClick={onDiscard}>
          Descartarlo y empezar este
        </Button>
      </div>
    </div>
  );
}
