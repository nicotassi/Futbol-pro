import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { usePlayer } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { friendlyError } from '@/services/errors';
import { useExercises } from '@/features/training/hooks';
import { ExercisePicker } from '@/features/training/ExercisePicker';
import {
  fetchWorkout,
  saveWorkout,
  trainingKeys,
  type WorkoutDraft,
  type WorkoutWithItems,
  type WorkoutItemDraft,
} from '@/features/training/api';
import { estimateMinutes, validateWorkout } from '@/features/training/workoutDraft';

interface ItemRow extends WorkoutItemDraft {
  key: string;
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
const field = (n: number | null) => (n === null ? '' : String(n));

interface BuilderState {
  name: string;
  objective: string;
  notes: string;
  estMinutes: string;
  kind: 'template' | 'scheduled';
  date: string;
  items: ItemRow[];
}

const emptyState: BuilderState = {
  name: '',
  objective: '',
  notes: '',
  estMinutes: '',
  kind: 'template',
  date: '',
  items: [],
};

function fromWorkout(w: WorkoutWithItems, duplicate: boolean): BuilderState {
  return {
    name: duplicate ? `${w.name} (copia)`.slice(0, 80) : w.name,
    objective: w.objective ?? '',
    notes: w.notes ?? '',
    estMinutes: field(w.est_minutes),
    kind: w.scheduled_for && !duplicate ? 'scheduled' : 'template',
    date: duplicate ? '' : (w.scheduled_for ?? ''),
    items: w.items.map((it) => ({
      key: crypto.randomUUID(),
      exercise_id: it.exercise_id,
      sets: it.sets,
      reps: it.reps,
      duration_sec: it.duration_sec,
      rest_sec: it.rest_sec,
      instructions: it.instructions ?? '',
    })),
  };
}

/** Crear, editar y duplicar entrenamientos (solo papá). */
export default function WorkoutBuilderPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const duplicateOf = params.get('duplicar');
  const sourceId = id ?? duplicateOf;
  useDocumentTitle(id ? 'Editar entrenamiento' : 'Nuevo entrenamiento');
  const exercises = useExercises();
  const source = useQuery({
    queryKey: trainingKeys.workout(sourceId ?? ''),
    queryFn: () => fetchWorkout(sourceId!),
    enabled: Boolean(sourceId),
  });
  if (exercises.isPending || (sourceId && source.isPending)) return <LoadingState rows={3} />;
  const initial = source.data ? fromWorkout(source.data, Boolean(duplicateOf)) : emptyState;
  return (
    <WorkoutBuilder
      key={sourceId ?? 'nuevo'}
      id={id}
      duplicate={Boolean(duplicateOf)}
      initial={initial}
    />
  );
}

function WorkoutBuilder({
  id,
  duplicate,
  initial,
}: {
  id?: string;
  duplicate: boolean;
  initial: BuilderState;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const player = usePlayer();
  const online = useOnlineStatus();
  const exercises = useExercises();
  const [name, setName] = useState(initial.name);
  const [objective, setObjective] = useState(initial.objective);
  const [notes, setNotes] = useState(initial.notes);
  const [estMinutes, setEstMinutes] = useState(initial.estMinutes);
  const [kind, setKind] = useState<'template' | 'scheduled'>(initial.kind);
  const [date, setDate] = useState(initial.date);
  const [items, setItems] = useState<ItemRow[]>(initial.items);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const byId = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  );
  const suggested = estimateMinutes(items, byId);

  const mutation = useMutation({
    mutationFn: (draft: WorkoutDraft) => saveWorkout(player.id, draft),
    onSuccess: (savedId) => {
      void queryClient.invalidateQueries({ queryKey: trainingKeys.workouts(player.id) });
      void queryClient.invalidateQueries({ queryKey: trainingKeys.workout(savedId) });
      navigate('/entrenar', { replace: true });
    },
  });

  const update = (key: string, patch: Partial<ItemRow>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const move = (index: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const draft: WorkoutDraft = {
      id: id ?? undefined,
      name: name.trim(),
      objective: objective.trim(),
      notes: notes.trim(),
      est_minutes: estMinutes.trim() ? Number(estMinutes) : suggested || null,
      is_template: kind === 'template',
      scheduled_for: kind === 'scheduled' ? date || null : null,
      items: items.map((it) => ({
        exercise_id: it.exercise_id,
        sets: it.sets,
        reps: it.reps,
        duration_sec: it.duration_sec,
        rest_sec: it.rest_sec,
        instructions: it.instructions,
      })),
    };
    const problems = validateWorkout(draft);
    setErrors(problems);
    if (problems.length === 0) mutation.mutate(draft);
  };

  return (
    <>
      <TopBar title={id ? 'Editar entrenamiento' : 'Nuevo entrenamiento'} backTo="/entrenar" />
      <PageHeader
        title={
          id ? 'Editar entrenamiento' : duplicate ? 'Duplicar entrenamiento' : 'Nuevo entrenamiento'
        }
      />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej.: Coordinación + técnica"
          />
          <Input
            label="Objetivo de la sesión"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ej.: mejorar el primer control"
          />
          <Segmented<'template' | 'scheduled'>
            label="Tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'template', label: 'Plantilla' },
              { value: 'scheduled', label: 'Con fecha' },
            ]}
          />
          {kind === 'scheduled' && (
            <Input
              label="Fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          <Input
            label="Duración total (minutos)"
            inputMode="numeric"
            value={estMinutes}
            onChange={(e) => setEstMinutes(e.target.value)}
            placeholder={suggested ? String(suggested) : ''}
            hint={suggested ? `Sugerido según los ejercicios: ${suggested} min.` : undefined}
          />
          <Textarea
            label="Instrucciones generales"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </Card>

        <div className="mt-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ejercicios</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPicking(true)}
            leadingIcon={<Plus className="size-4" />}
          >
            Agregar
          </Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <EmptyState
              compact
              title="Todavía no agregaste ejercicios"
              description="Elegilos de la biblioteca y ordenalos como quieras."
            />
          </Card>
        ) : (
          <ol className="flex flex-col gap-3">
            {items.map((it, i) => {
              const ex = byId.get(it.exercise_id);
              return (
                <li key={it.key}>
                  <Card>
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-gold">
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 truncate font-display font-semibold">
                        {ex?.name ?? 'Ejercicio'}
                      </p>
                      <IconButton
                        label="Subir"
                        icon={<ArrowUp className="size-4" />}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      />
                      <IconButton
                        label="Bajar"
                        icon={<ArrowDown className="size-4" />}
                        disabled={i === items.length - 1}
                        onClick={() => move(i, 1)}
                      />
                      <IconButton
                        label={`Quitar ${ex?.name ?? 'ejercicio'}`}
                        icon={<Trash2 className="size-4" />}
                        onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Input
                        label="Series"
                        inputMode="numeric"
                        value={field(it.sets)}
                        onChange={(e) => update(it.key, { sets: numOrNull(e.target.value) })}
                      />
                      <Input
                        label="Repeticiones"
                        inputMode="numeric"
                        value={field(it.reps)}
                        onChange={(e) => update(it.key, { reps: numOrNull(e.target.value) })}
                      />
                      <Input
                        label="Duración (min)"
                        inputMode="decimal"
                        value={it.duration_sec === null ? '' : String(it.duration_sec / 60)}
                        onChange={(e) =>
                          update(it.key, {
                            duration_sec:
                              e.target.value.trim() === ''
                                ? null
                                : Math.round(Number(e.target.value.replace(',', '.')) * 60),
                          })
                        }
                      />
                      <Input
                        label="Descanso (seg)"
                        inputMode="numeric"
                        value={field(it.rest_sec)}
                        onChange={(e) => update(it.key, { rest_sec: numOrNull(e.target.value) })}
                      />
                    </div>
                    <Input
                      className="mt-1"
                      label="Indicaciones"
                      value={it.instructions}
                      onChange={(e) => update(it.key, { instructions: e.target.value })}
                      placeholder="Opcional"
                    />
                  </Card>
                </li>
              );
            })}
          </ol>
        )}

        {errors.length > 0 && (
          <ul
            role="alert"
            className="rounded-[12px] bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger"
          >
            {errors.map((er) => (
              <li key={er}>{er}</li>
            ))}
          </ul>
        )}
        {mutation.isError && (
          <p
            role="alert"
            className="rounded-[12px] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
          >
            {friendlyError(mutation.error)}
          </p>
        )}
        {!online && (
          <p className="text-sm text-warning">
            Sin conexión: para guardar entrenamientos necesitás internet.
          </p>
        )}
        <Button type="submit" size="lg" block disabled={mutation.isPending || !online}>
          {mutation.isPending ? 'Guardando…' : 'Guardar entrenamiento'}
        </Button>
      </form>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        exercises={exercises.data ?? []}
        onPick={(ex) => {
          setItems((l) => [
            ...l,
            {
              key: crypto.randomUUID(),
              exercise_id: ex.id,
              sets: null,
              reps: null,
              duration_sec: ex.est_minutes ? ex.est_minutes * 60 : null,
              rest_sec: null,
              instructions: '',
            },
          ]);
          setPicking(false);
        }}
      />
    </>
  );
}
