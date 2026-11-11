import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Package,
  Star,
  Target,
  Trash2,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { friendlyError } from '@/services/errors';
import { useExercises, useFavorites } from '@/features/training/hooks';
import { categoryInfo, difficultyLabel } from '@/features/training/exerciseMeta';
import { deleteExercise, setFavorite, trainingKeys } from '@/features/training/api';
import { cn } from '@/utils/cn';

export default function ExerciseDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const player = usePlayer();
  const exercises = useExercises();
  const favorites = useFavorites();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const exercise = exercises.data?.find((e) => e.id === id);
  useDocumentTitle(exercise?.name ?? 'Ejercicio');

  const isFavorite = Boolean(favorites.data?.includes(id));
  const favMutation = useMutation({
    mutationFn: (fav: boolean) => setFavorite(user!.id, player.id, id, fav),
    onMutate: async (fav) => {
      const key = trainingKeys.favorites(user!.id);
      queryClient.setQueryData<string[]>(key, (old = []) =>
        fav ? [...old, id] : old.filter((x) => x !== id),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: trainingKeys.favorites(user!.id) }),
  });

  const delMutation = useMutation({
    mutationFn: () => deleteExercise(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trainingKeys.exercises(player.id) });
      navigate('/entrenar/ejercicios', { replace: true });
    },
  });

  if (exercises.isPending) return <LoadingState rows={3} />;
  if (!exercise) {
    return (
      <>
        <TopBar title="Ejercicio" backTo="/entrenar/ejercicios" />
        <EmptyState
          title="Ejercicio no encontrado"
          action={<LinkButton to="/entrenar/ejercicios">Ir a la biblioteca</LinkButton>}
        />
      </>
    );
  }

  const { icon: Icon, name: categoryName } = categoryInfo(exercise.category);
  const deleteError =
    delMutation.isError && (delMutation.error as { code?: string })?.code === '23503'
      ? 'Este ejercicio está en un entrenamiento. Quitalo de ahí antes de borrarlo.'
      : delMutation.isError
        ? friendlyError(delMutation.error)
        : null;

  return (
    <>
      <TopBar
        title="Ejercicio"
        backTo="/entrenar/ejercicios"
        actions={
          <IconButton
            label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-pressed={isFavorite}
            icon={<Star className={cn('size-5', isFavorite && 'fill-gold text-gold')} />}
            onClick={() => favMutation.mutate(!isFavorite)}
          />
        }
      />

      <Card tone="dark">
        <div className="flex items-start gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-full bg-coal-2 text-gold ring-1 ring-gold/40"
            aria-hidden
          >
            <Icon className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-gold">{categoryName}</p>
            <h1 className="text-2xl leading-tight font-semibold">{exercise.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="dark">{difficultyLabel[exercise.difficulty]}</Badge>
              {exercise.est_minutes && <Badge tone="dark">{exercise.est_minutes} min</Badge>}
              {exercise.is_custom && <Badge tone="dark">Propio</Badge>}
            </div>
          </div>
        </div>
        {exercise.objective && (
          <p className="mt-4 text-[0.9375rem] text-bone/90">{exercise.objective}</p>
        )}
      </Card>

      {exercise.description && <p className="mt-4 text-[0.9375rem]">{exercise.description}</p>}

      {exercise.media_url && (
        <a
          href={exercise.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 rounded-[14px] border border-line bg-surface px-4 py-3 text-sm font-semibold text-gold-strong"
        >
          <ExternalLink className="size-4" aria-hidden /> Ver video o imagen demostrativa
        </a>
      )}

      {exercise.steps.length > 0 && (
        <section className="mt-6" aria-label="Paso a paso">
          <h2 className="mb-2 text-lg font-semibold">Paso a paso</h2>
          <ol className="flex flex-col gap-2">
            {exercise.steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-[14px] bg-surface p-3 text-sm ring-1 ring-line"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-coal text-xs font-bold text-gold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {exercise.materials.length > 0 && (
          <InfoBlock
            icon={<Package className="size-4" />}
            title="Materiales"
            items={exercise.materials}
          />
        )}
        {exercise.common_mistakes.length > 0 && (
          <InfoBlock
            icon={<AlertTriangle className="size-4" />}
            title="Errores frecuentes"
            items={exercise.common_mistakes}
          />
        )}
        {exercise.precautions && (
          <InfoBlock
            icon={<CheckCircle2 className="size-4" />}
            title="Precauciones"
            items={[exercise.precautions]}
          />
        )}
        {exercise.result_indicator && (
          <InfoBlock
            icon={<Target className="size-4" />}
            title="Cómo medir el resultado"
            items={[exercise.result_indicator]}
          />
        )}
      </div>

      {isAdmin && (
        <div className="mt-8 flex gap-2">
          <LinkButton
            to={`/entrenar/ejercicios/${exercise.id}/editar`}
            variant="secondary"
            block
            leadingIcon={<Pencil className="size-4" />}
          >
            Editar
          </LinkButton>
          <Button
            variant="secondary"
            block
            onClick={() => setConfirmDelete(true)}
            leadingIcon={<Trash2 className="size-4" />}
          >
            Eliminar
          </Button>
        </div>
      )}

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar ejercicio?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              block
              disabled={delMutation.isPending}
              onClick={() => delMutation.mutate()}
            >
              {delMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">“{exercise.name}” se va a quitar de la biblioteca.</p>
        {deleteError && (
          <p
            role="alert"
            className="mt-3 rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {deleteError}
          </p>
        )}
      </Sheet>
    </>
  );
}

function InfoBlock({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <Card>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-strong">
        {icon}
        {title}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((it, i) => (
          <li key={i}>• {it}</li>
        ))}
      </ul>
    </Card>
  );
}
