import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, PlusCircle, Search } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { usePlayer } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { createExercise, trainingKeys } from './api';
import { exerciseFormSchema, type ExerciseFormInput } from './exerciseSchema';
import { exerciseCategories } from '@/config/exerciseCategories';
import { categoryInfo } from './exerciseMeta';
import type { Exercise, ExerciseCategory } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
}

const blankExercise: ExerciseFormInput = {
  name: '',
  category: 'technique',
  objective: '',
  description: '',
  difficulty: '1',
  est_minutes: '',
  materials: '',
  steps: '',
  common_mistakes: '',
  precautions: '',
  result_indicator: '',
  media_url: '',
};

/** Crear un ejercicio nuevo sin salir del armado de la rutina. */
function QuickExercise({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (e: Exercise) => void;
}) {
  const player = usePlayer();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ExerciseFormInput>(blankExercise);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof ExerciseFormInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = exerciseFormSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    setSaving(true);
    try {
      const created = await createExercise(player.id, parsed.data);
      await queryClient.invalidateQueries({ queryKey: trainingKeys.exercises(player.id) });
      onCreated(created);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        El ejercicio se guarda en tu biblioteca y se agrega a esta rutina.
      </p>
      <Input
        label="Nombre del ejercicio"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Categoría"
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
        >
          {exerciseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.short}
            </option>
          ))}
        </Select>
        <Input
          label="Minutos (opcional)"
          inputMode="numeric"
          value={form.est_minutes}
          onChange={(e) => set('est_minutes', e.target.value)}
        />
      </div>
      <Textarea
        label="Paso a paso (opcional, uno por línea)"
        rows={3}
        value={form.steps}
        onChange={(e) => set('steps', e.target.value)}
      />
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
          {saving ? 'Creando…' : 'Crear y agregar'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Volver
        </Button>
      </div>
    </form>
  );
}

/** Hoja para elegir ejercicios de la biblioteca o crear uno nuevo al vuelo. */
export function ExercisePicker({ open, onClose, exercises, onPick }: Props) {
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) => (!category || e.category === category) && (!q || e.name.toLowerCase().includes(q)),
    );
  }, [exercises, category, query]);

  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'Ejercicio nuevo' : 'Agregar ejercicio'}>
      {creating ? (
        <QuickExercise
          onCancel={() => setCreating(false)}
          onCreated={(ex) => {
            setCreating(false);
            onPick(ex);
          }}
        />
      ) : (
        <>
          <Button
            type="button"
            variant="accent"
            block
            className="mb-3"
            onClick={() => setCreating(true)}
            leadingIcon={<PlusCircle className="size-4" />}
          >
            Crear ejercicio nuevo
          </Button>
          <label className="relative block">
            <span className="sr-only">Buscar</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ejercicio"
              className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface pr-3.5 pl-10 outline-none focus:border-gold"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <Chip selected={!category} onClick={() => setCategory(null)}>
              Todas
            </Chip>
            {exerciseCategories.map((c) => (
              <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>
                {c.short}
              </Chip>
            ))}
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {visible.map((e) => {
              const { icon: Icon, short } = categoryInfo(e.category);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onPick(e)}
                    className="flex w-full items-center gap-3 py-3 text-left hover:bg-sand/50"
                    aria-label={`Agregar ${e.name}`}
                  >
                    <Icon className="size-5 shrink-0 text-gold-strong" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.name}</span>
                      <span className="text-xs text-muted">{short}</span>
                    </span>
                    <Plus className="size-5 text-muted" aria-hidden />
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="py-6 text-center text-sm text-muted">Sin resultados.</li>
            )}
          </ul>
        </>
      )}
    </Sheet>
  );
}
