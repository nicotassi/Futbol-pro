import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BookOpen, Search } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { exerciseCategories } from '@/config/exerciseCategories';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ExerciseCategory } from '@/types/domain';

export default function ExercisesPage() {
  useDocumentTitle('Biblioteca de ejercicios');
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const selected = params.get('categoria') as ExerciseCategory | null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseCategories
      .filter((c) => !selected || c.id === selected)
      .map((c) => ({
        ...c,
        topics: q ? c.topics.filter((t) => t.toLowerCase().includes(q)) : c.topics,
      }))
      .filter((c) => c.topics.length > 0);
  }, [selected, query]);

  const select = (id: ExerciseCategory | null) => {
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
      />

      <label className="relative block">
        <span className="sr-only">Buscar tema</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar tema (ej.: pase, equilibrio)"
          className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface pr-3.5 pl-10 text-[0.9375rem] outline-none focus:border-gold focus:ring-3 focus:ring-gold/25"
        />
      </label>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={!selected} onClick={() => select(null)}>
          Todas
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

      <PhaseNotice
        className="mt-4"
        phase={3}
        feature="La ficha completa de cada ejercicio (instrucciones, video, favoritos)"
      />

      <div className="mt-4 flex flex-col gap-3">
        {visible.length === 0 && (
          <Card>
            <EmptyState
              icon={<Search className="size-6" />}
              title="Sin resultados"
              description="Probá con otra palabra o elegí otra categoría."
            />
          </Card>
        )}
        {visible.map(({ id, name, description, icon: Icon, topics }) => (
          <Card key={id} as="article">
            <div className="flex items-start gap-3">
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-gold"
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold">{name}</h2>
                <p className="text-sm text-muted">{description}</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`Temas de ${name}`}>
              {topics.map((t) => (
                <li key={t}>
                  <Badge>{t}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card tone="plain" className="mt-4">
        <EmptyState
          compact
          icon={<BookOpen className="size-5" />}
          title="Los ejercicios se cargan en la Fase 3"
          description="Papá podrá crear, editar y eliminar ejercicios personalizados."
        />
      </Card>
    </>
  );
}
