import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, Star } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { exerciseCategories } from '@/config/exerciseCategories';
import { useAuth } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { friendlyError } from '@/services/errors';
import { useExercises, useFavorites } from '@/features/training/hooks';
import { ExerciseCard } from '@/features/training/ExerciseCard';
import type { ExerciseCategory } from '@/features/training/api';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function ExercisesPage() {
  useDocumentTitle('Biblioteca de ejercicios');
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const exercises = useExercises();
  const favorites = useFavorites();
  const selected = params.get('categoria') as ExerciseCategory | 'favoritos' | null;
  const favSet = useMemo(() => new Set(favorites.data ?? []), [favorites.data]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return (exercises.data ?? []).filter((e) => {
      if (selected === 'favoritos' && !favSet.has(e.id)) return false;
      if (selected && selected !== 'favoritos' && e.category !== selected) return false;
      if (!q) return true;
      return normalize(`${e.name} ${e.objective ?? ''} ${e.description ?? ''}`).includes(q);
    });
  }, [exercises.data, selected, query, favSet]);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('categoria', id);
    else next.delete('categoria');
    setParams(next, { replace: true });
  };

  return (
    <>
      <TopBar title="Biblioteca" backTo="/entrenar" />
      <PageHeader
        title="Biblioteca de ejercicios"
        description="Seis categorías para un desarrollo completo y equilibrado."
        action={
          isAdmin && (
            <LinkButton
              to="/entrenar/ejercicios/nuevo"
              size="sm"
              leadingIcon={<Plus className="size-4" />}
            >
              Nuevo
            </LinkButton>
          )
        }
      />

      <label className="relative block">
        <span className="sr-only">Buscar ejercicio</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar (ej.: pase, equilibrio)"
          className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface pr-3.5 pl-10 text-[0.9375rem] outline-none focus:border-gold focus:ring-3 focus:ring-gold/25"
        />
      </label>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={!selected} onClick={() => select(null)}>
          Todas
        </Chip>
        <Chip
          selected={selected === 'favoritos'}
          onClick={() => select('favoritos')}
          icon={<Star className="size-4" aria-hidden />}
        >
          Favoritos
        </Chip>
        {exerciseCategories.map(({ id, short, icon: Icon }) => (
          <Chip
            key={id}
            selected={selected === id}
            onClick={() => select(id)}
            icon={<Icon className="size-4" aria-hidden />}
          >
            {short}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {exercises.isPending ? (
          <LoadingState rows={4} />
        ) : exercises.isError ? (
          <ErrorState
            description={friendlyError(exercises.error)}
            onRetry={() => void exercises.refetch()}
          />
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={
                selected === 'favoritos' ? (
                  <Star className="size-6" />
                ) : (
                  <Search className="size-6" />
                )
              }
              title={selected === 'favoritos' ? 'Todavía no hay favoritos' : 'Sin resultados'}
              description={
                selected === 'favoritos'
                  ? 'Abrí un ejercicio y tocá la estrella para tenerlo a mano.'
                  : 'Probá con otra palabra o elegí otra categoría.'
              }
            />
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted" aria-live="polite">
              {visible.length === 1 ? '1 ejercicio' : `${visible.length} ejercicios`}
            </p>
            <ul className="flex flex-col gap-2.5">
              {visible.map((e) => (
                <li key={e.id}>
                  <ExerciseCard exercise={e} favorite={favSet.has(e.id)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
