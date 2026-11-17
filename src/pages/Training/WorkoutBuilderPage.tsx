import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Copy, Layers, Minus, Plus, Trash2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
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
import {
  blockLabel,
  clampRepeats,
  flattenBlocks,
  groupBlocks,
  type Block,
} from '@/features/training/blocks';

interface ItemRow extends WorkoutItemDraft {
  key: string;
}
type BlockRow = Block<ItemRow>;

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
const field = (n: number | null) => (n === null ? '' : String(n));
const uid = () => crypto.randomUUID();
const newBlock = (): BlockRow => ({ key: uid(), name: '', repeats: 1, items: [] });

interface BuilderState {
  name: string;
  objective: string;
  notes: string;
  estMinutes: string;
  kind: 'template' | 'scheduled';
  date: string;
  blocks: BlockRow[];
}

const emptyState: BuilderState = {
  name: '',
  objective: '',
  notes: '',
  estMinutes: '',
  kind: 'template',
  date: '',
  blocks: [newBlock()],
};

function fromWorkout(w: WorkoutWithItems, duplicate: boolean): BuilderState {
  const rows = w.items.map((it) => ({
    key: uid(),
    exercise_id: it.exercise_id,
    sets: it.sets,
    reps: it.reps,
    duration_sec: it.duration_sec,
    rest_sec: it.rest_sec,
    instructions: it.instructions ?? '',
    block: it.block ?? 0,
    block_repeats: it.block_repeats ?? 1,
    block_name: it.block_name ?? null,
  }));
  return {
    name: duplicate ? `${w.name} (copia)`.slice(0, 80) : w.name,
    objective: w.objective ?? '',
    notes: w.notes ?? '',
    estMinutes: field(w.est_minutes),
    kind: w.scheduled_for && !duplicate ? 'scheduled' : 'template',
    date: duplicate ? '' : (w.scheduled_for ?? ''),
    blocks: rows.length ? groupBlocks(rows, uid) : [newBlock()],
  };
}

/** Crear, editar y duplicar entrenamientos por módulos (solo papá). */
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
  const [blocks, setBlocks] = useState<BlockRow[]>(initial.blocks);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const byId = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  );
  const flat = useMemo(() => flattenBlocks(blocks), [blocks]);
  const suggested = estimateMinutes(flat, byId);

  const mutation = useMutation({
    mutationFn: (draft: WorkoutDraft) => saveWorkout(player.id, draft),
    onSuccess: (savedId) => {
      void queryClient.invalidateQueries({ queryKey: trainingKeys.workouts(player.id) });
      void queryClient.invalidateQueries({ queryKey: trainingKeys.workout(savedId) });
      navigate('/entrenar', { replace: true });
    },
  });

  // ---- Edición de módulos y ejercicios (todo en memoria hasta guardar) ----
  const patchBlock = (key: string, patch: Partial<BlockRow>) =>
    setBlocks((l) => l.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const patchItem = (bKey: string, iKey: string, patch: Partial<ItemRow>) =>
    setBlocks((l) =>
      l.map((b) =>
        b.key === bKey
          ? { ...b, items: b.items.map((it) => (it.key === iKey ? { ...it, ...patch } : it)) }
          : b,
      ),
    );
  const moveIn = <T,>(list: T[], index: number, dir: -1 | 1): T[] => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
  };
  const moveItem = (bKey: string, index: number, dir: -1 | 1) =>
    setBlocks((l) =>
      l.map((b) => (b.key === bKey ? { ...b, items: moveIn(b.items, index, dir) } : b)),
    );
  const removeItem = (bKey: string, iKey: string) =>
    setBlocks((l) =>
      l.map((b) => (b.key === bKey ? { ...b, items: b.items.filter((x) => x.key !== iKey) } : b)),
    );
  const duplicateBlock = (key: string) =>
    setBlocks((l) => {
      const i = l.findIndex((b) => b.key === key);
      const src = l[i]!;
      const copy: BlockRow = {
        ...src,
        key: uid(),
        name: src.name ? `${src.name} (copia)` : '',
        items: src.items.map((it) => ({ ...it, key: uid() })),
      };
      return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)];
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
      items: flat.map((it) => ({
        exercise_id: it.exercise_id,
        sets: it.sets,
        reps: it.reps,
        duration_sec: it.duration_sec,
        rest_sec: it.rest_sec,
        instructions: it.instructions,
        block: it.block,
        block_repeats: it.block_repeats,
        block_name: it.block_name,
      })),
    };
    const problems = validateWorkout(draft);
    if (flat.length > 0)
      blocks.forEach((b, i) => {
        if (b.items.length === 0)
          problems.push(`${blockLabel(b.name, i)} no tiene ejercicios: agregale alguno o quitalo.`);
      });
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

        <div className="mt-2">
          <h2 className="text-lg font-semibold">Módulos</h2>
          <p className="text-sm text-muted">
            Un módulo es un grupo de ejercicios que se repite varias veces. Se hacen uno después del
            otro, en el orden que los armes.
          </p>
        </div>

        <ol className="flex flex-col gap-4">
          {blocks.map((b, bi) => (
            <li key={b.key}>
              <BlockCard
                block={b}
                index={bi}
                count={blocks.length}
                byId={byId}
                onPatch={(patch) => patchBlock(b.key, patch)}
                onMove={(dir) => setBlocks((l) => moveIn(l, bi, dir))}
                onDuplicate={() => duplicateBlock(b.key)}
                onRemove={() => setBlocks((l) => l.filter((x) => x.key !== b.key))}
                onAddExercise={() => setPickingFor(b.key)}
                onPatchItem={(iKey, patch) => patchItem(b.key, iKey, patch)}
                onMoveItem={(i, dir) => moveItem(b.key, i, dir)}
                onRemoveItem={(iKey) => removeItem(b.key, iKey)}
              />
            </li>
          ))}
        </ol>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setBlocks((l) => [...l, newBlock()])}
          leadingIcon={<Layers className="size-4" />}
        >
          Agregar otro módulo
        </Button>

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
        open={pickingFor !== null}
        onClose={() => setPickingFor(null)}
        exercises={exercises.data ?? []}
        onPick={(ex) => {
          const target = pickingFor;
          if (target)
            patchBlock(target, {
              items: [
                ...(blocks.find((b) => b.key === target)?.items ?? []),
                {
                  key: uid(),
                  exercise_id: ex.id,
                  sets: null,
                  reps: null,
                  duration_sec: ex.est_minutes ? ex.est_minutes * 60 : null,
                  rest_sec: null,
                  instructions: '',
                },
              ],
            });
          setPickingFor(null);
        }}
      />
    </>
  );
}

function BlockCard({
  block,
  index,
  count,
  byId,
  onPatch,
  onMove,
  onDuplicate,
  onRemove,
  onAddExercise,
  onPatchItem,
  onMoveItem,
  onRemoveItem,
}: {
  block: BlockRow;
  index: number;
  count: number;
  byId: Map<string, { name: string }>;
  onPatch: (patch: Partial<BlockRow>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddExercise: () => void;
  onPatchItem: (itemKey: string, patch: Partial<ItemRow>) => void;
  onMoveItem: (index: number, dir: -1 | 1) => void;
  onRemoveItem: (itemKey: string) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const label = blockLabel(block.name, index);
  return (
    <Card className="border-gold/40">
      <div className="flex items-start gap-2">
        <span className="mt-2 grid size-8 shrink-0 place-items-center rounded-full bg-coal text-sm font-bold text-gold">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <Input
            label={`Nombre del módulo ${index + 1}`}
            value={block.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder={`Módulo ${index + 1}`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-[12px] bg-sand px-3 py-2">
        <span className="text-sm font-medium" id={`rep-${block.key}`}>
          Se repite
        </span>
        <div className="flex items-center gap-1" role="group" aria-labelledby={`rep-${block.key}`}>
          <IconButton
            label={`Menos vueltas de ${label}`}
            icon={<Minus className="size-4" />}
            disabled={block.repeats <= 1}
            onClick={() => onPatch({ repeats: clampRepeats(block.repeats - 1) })}
          />
          <span
            className="tabular w-16 text-center font-display text-lg font-semibold"
            aria-live="polite"
          >
            {block.repeats} {block.repeats === 1 ? 'vez' : 'veces'}
          </span>
          <IconButton
            label={`Más vueltas de ${label}`}
            icon={<Plus className="size-4" />}
            disabled={block.repeats >= 50}
            onClick={() => onPatch({ repeats: clampRepeats(block.repeats + 1) })}
          />
        </div>
      </div>

      {block.items.length === 0 ? (
        <p className="mt-3 rounded-[12px] border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
          Todavía no hay ejercicios en este módulo.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2.5">
          {block.items.map((it, i) => (
            <li key={it.key}>
              <ItemEditor
                item={it}
                number={i + 1}
                name={byId.get(it.exercise_id)?.name ?? 'Ejercicio'}
                isFirst={i === 0}
                isLast={i === block.items.length - 1}
                onPatch={(patch) => onPatchItem(it.key, patch)}
                onMove={(dir) => onMoveItem(i, dir)}
                onRemove={() => onRemoveItem(it.key)}
              />
            </li>
          ))}
        </ol>
      )}

      <Button
        type="button"
        size="sm"
        variant="accent"
        className="mt-3"
        onClick={onAddExercise}
        leadingIcon={<Plus className="size-4" />}
      >
        Agregar ejercicio a {label}
      </Button>

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line pt-3">
        <IconButton
          label={`Subir ${label}`}
          icon={<ArrowUp className="size-4" />}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        />
        <IconButton
          label={`Bajar ${label}`}
          icon={<ArrowDown className="size-4" />}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        />
        <IconButton
          label={`Duplicar ${label}`}
          icon={<Copy className="size-4" />}
          onClick={onDuplicate}
        />
        <span className="flex-1" />
        {confirmRemove ? (
          <>
            <span className="text-sm text-danger">¿Quitar el módulo?</span>
            <Button type="button" size="sm" variant="danger" onClick={onRemove}>
              Sí, quitar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
              No
            </Button>
          </>
        ) : (
          <IconButton
            label={`Quitar ${label}`}
            icon={<Trash2 className="size-4" />}
            onClick={() => (block.items.length === 0 ? onRemove() : setConfirmRemove(true))}
          />
        )}
      </div>
    </Card>
  );
}

function ItemEditor({
  item: it,
  number,
  name,
  isFirst,
  isLast,
  onPatch,
  onMove,
  onRemove,
}: {
  item: ItemRow;
  number: number;
  name: string;
  isFirst: boolean;
  isLast: boolean;
  onPatch: (patch: Partial<ItemRow>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  // Lo básico siempre a la vista; series, descanso e indicaciones, en "Más opciones".
  const hasExtra = it.sets !== null || it.rest_sec !== null || it.instructions.trim() !== '';
  const [more, setMore] = useState(hasExtra);
  return (
    <div className="rounded-[14px] border border-line bg-surface p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-muted">{number}.</span>
        <p className="min-w-0 flex-1 truncate font-display font-semibold">{name}</p>
        <IconButton
          label={`Subir ${name}`}
          icon={<ArrowUp className="size-4" />}
          disabled={isFirst}
          onClick={() => onMove(-1)}
        />
        <IconButton
          label={`Bajar ${name}`}
          icon={<ArrowDown className="size-4" />}
          disabled={isLast}
          onClick={() => onMove(1)}
        />
        <IconButton
          label={`Quitar ${name}`}
          icon={<Trash2 className="size-4" />}
          onClick={onRemove}
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          label="Tiempo (min)"
          inputMode="decimal"
          value={it.duration_sec === null ? '' : String(it.duration_sec / 60)}
          onChange={(e) =>
            onPatch({
              duration_sec:
                e.target.value.trim() === ''
                  ? null
                  : Math.round(Number(e.target.value.replace(',', '.')) * 60),
            })
          }
        />
        <Input
          label="Repeticiones"
          inputMode="numeric"
          value={field(it.reps)}
          onChange={(e) => onPatch({ reps: numOrNull(e.target.value) })}
        />
      </div>
      <button
        type="button"
        aria-expanded={more}
        onClick={() => setMore((m) => !m)}
        className="mt-2 text-xs font-semibold text-gold-strong hover:underline"
      >
        {more ? 'Menos opciones' : 'Más opciones (series, descanso, indicaciones)'}
      </button>
      {more && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Series"
              inputMode="numeric"
              value={field(it.sets)}
              onChange={(e) => onPatch({ sets: numOrNull(e.target.value) })}
            />
            <Input
              label="Descanso (seg)"
              inputMode="numeric"
              value={field(it.rest_sec)}
              onChange={(e) => onPatch({ rest_sec: numOrNull(e.target.value) })}
            />
          </div>
          <Input
            label="Indicaciones"
            value={it.instructions}
            onChange={(e) => onPatch({ instructions: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      )}
    </div>
  );
}
