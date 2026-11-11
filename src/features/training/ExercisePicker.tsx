import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Chip';
import { exerciseCategories } from '@/config/exerciseCategories';
import { categoryInfo } from './exerciseMeta';
import type { Exercise, ExerciseCategory } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
}

/** Hoja para elegir ejercicios de la biblioteca. */
export function ExercisePicker({ open, onClose, exercises, onPick }: Props) {
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter(
      (e) => (!category || e.category === category) && (!q || e.name.toLowerCase().includes(q)),
    );
  }, [exercises, category, query]);

  return (
    <Sheet open={open} onClose={onClose} title="Agregar ejercicio">
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
    </Sheet>
  );
}
