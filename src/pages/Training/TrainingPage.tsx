import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Copy,
  LayoutTemplate,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { exerciseCategories } from '@/config/exerciseCategories';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { friendlyError } from '@/services/errors';
import { useSessions, useWorkouts } from '@/features/training/hooks';
import { deleteWorkout, trainingKeys, type Workout } from '@/features/training/api';
import {
  clearActiveSession,
  loadActiveSession,
  type ActiveSession,
} from '@/features/training/activeSession';
import { scheduledLabel } from '@/features/training/format';
import { FreeSessionSheet } from '@/features/training/FreeSessionSheet';
import { SessionList } from '@/features/training/SessionList';

export default function TrainingPage() {
  useDocumentTitle('Entrenar');
  const { isAdmin } = useAuth();
  const player = usePlayer();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workouts = useWorkouts();
  const sessions = useSessions();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [menuFor, setMenuFor] = useState<Workout | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Workout | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadActiveSession().then((s) => setActive(s && s.playerId === player.id ? s : null));
  }, [player.id]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { upcoming, templates } = useMemo(() => {
    const list = workouts.data ?? [];
    return {
      upcoming: list.filter((w) => !w.is_template && w.scheduled_for && w.scheduled_for >= today),
      templates: list.filter((w) => w.is_template),
    };
  }, [workouts.data, today]);

  const del = useMutation({
    mutationFn: (id: string) => deleteWorkout(id),
    onSuccess: () => {
      setConfirmDelete(null);
      void queryClient.invalidateQueries({ queryKey: trainingKeys.workouts(player.id) });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Centro de entrenamiento"
        title="Entrenar"
        description="Sesiones, plantillas y biblioteca de ejercicios."
        action={
          isAdmin && (
            <LinkButton to="/entrenar/nuevo" size="sm" leadingIcon={<Plus className="size-4" />}>
              Nuevo
            </LinkButton>
          )
        }
      />

      {active && (
        <Card tone="dark" className="mb-4">
          <p className="eyebrow text-gold">Entrenamiento sin terminar</p>
          <p className="mt-1 font-display text-lg font-semibold">{active.title}</p>
          <p className="text-sm text-fog">
            Ejercicio {active.index + 1} de {active.items.length} · se guardó en el celular
          </p>
          <div className="mt-3 flex gap-2">
            <LinkButton
              to={`/entrenar/sesion/${active.workoutId}`}
              variant="accent"
              size="sm"
              leadingIcon={<RotateCcw className="size-4" />}
            >
              Continuar
            </LinkButton>
            <Button
              size="sm"
              variant="ghost"
              className="text-bone hover:bg-coal-2"
              onClick={async () => {
                await clearActiveSession();
                setActive(null);
              }}
            >
              Descartar
            </Button>
          </div>
        </Card>
      )}

      {savedMsg && (
        <p
          role="status"
          className="mb-4 rounded-[12px] bg-success-soft px-3 py-2.5 text-sm font-medium text-success"
        >
          {savedMsg}
        </p>
      )}

      <Button
        variant="secondary"
        block
        onClick={() => setFreeOpen(true)}
        leadingIcon={<ClipboardList className="size-4" />}
      >
        Registrar entrenamiento libre
      </Button>

      {workouts.isPending ? (
        <div className="mt-6">
          <LoadingState rows={3} />
        </div>
      ) : workouts.isError ? (
        <ErrorState
          description={friendlyError(workouts.error)}
          onRetry={() => void workouts.refetch()}
        />
      ) : (
        <>
          <Section title="Próximos">
            {upcoming.length === 0 ? (
              <Card>
                <EmptyState
                  compact
                  icon={<CalendarClock className="size-5" />}
                  title="Nada programado"
                  description={
                    isAdmin
                      ? 'Creá un entrenamiento con fecha desde “Nuevo”.'
                      : 'Cuando papá programe un entrenamiento, aparece acá.'
                  }
                />
              </Card>
            ) : (
              <WorkoutList items={upcoming} onMenu={setMenuFor} />
            )}
          </Section>

          <Section title="Plantillas">
            {templates.length === 0 ? (
              <Card>
                <EmptyState
                  compact
                  icon={<LayoutTemplate className="size-5" />}
                  title="Todavía no hay plantillas"
                  description={
                    isAdmin
                      ? 'Armá entrenamientos para repetir, como “Coordinación + técnica — 30 min”.'
                      : 'Las plantillas son entrenamientos para repetir. Las arma papá.'
                  }
                  action={
                    isAdmin && (
                      <LinkButton to="/entrenar/nuevo" size="sm" variant="secondary">
                        Crear plantilla
                      </LinkButton>
                    )
                  }
                />
              </Card>
            ) : (
              <WorkoutList items={templates} onMenu={setMenuFor} />
            )}
          </Section>
        </>
      )}

      <Section
        title="Historial"
        action={
          <Link
            to="/entrenar/historial"
            className="text-sm font-semibold text-gold-strong hover:underline"
          >
            Ver todo
          </Link>
        }
      >
        {sessions.isPending && !sessions.data ? (
          <LoadingState rows={2} />
        ) : (sessions.data ?? []).length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon={<Timer className="size-5" />}
              title="Sin sesiones registradas"
              description="Cada sesión guarda duración, ejercicios, esfuerzo y cómo te sentiste."
            />
          </Card>
        ) : (
          <SessionList sessions={(sessions.data ?? []).slice(0, 3)} isAdmin={isAdmin} />
        )}
      </Section>

      <Section
        title="Biblioteca de ejercicios"
        action={
          <Link
            to="/entrenar/ejercicios"
            className="text-sm font-semibold text-gold-strong hover:underline"
          >
            Ver todo
          </Link>
        }
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {exerciseCategories.map(({ id, short, icon: Icon, description }) => (
            <li key={id}>
              <Link
                to={`/entrenar/ejercicios?categoria=${id}`}
                className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-gold/50"
              >
                <span
                  className="grid size-10 place-items-center rounded-full bg-coal text-gold"
                  aria-hidden
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-display font-semibold">{short}</span>
                  <span className="line-clamp-2 text-xs text-muted">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Sheet open={Boolean(menuFor)} onClose={() => setMenuFor(null)} title={menuFor?.name ?? ''}>
        {menuFor && (
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              block
              leadingIcon={<Play className="size-5" />}
              onClick={() => navigate(`/entrenar/sesion/${menuFor.id}`)}
            >
              Empezar
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant="secondary"
                  block
                  leadingIcon={<Pencil className="size-4" />}
                  onClick={() => navigate(`/entrenar/${menuFor.id}/editar`)}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  block
                  leadingIcon={<Copy className="size-4" />}
                  onClick={() => navigate(`/entrenar/nuevo?duplicar=${menuFor.id}`)}
                >
                  Duplicar
                </Button>
                <Button
                  variant="ghost"
                  block
                  className="text-danger"
                  leadingIcon={<Trash2 className="size-4" />}
                  onClick={() => {
                    setConfirmDelete(menuFor);
                    setMenuFor(null);
                  }}
                >
                  Eliminar
                </Button>
              </>
            )}
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar entrenamiento?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              block
              disabled={del.isPending}
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
            >
              {del.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          “{confirmDelete?.name}” se va a eliminar. Las sesiones ya registradas se conservan.
        </p>
        {del.isError && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {friendlyError(del.error)}
          </p>
        )}
      </Sheet>

      <FreeSessionSheet
        open={freeOpen}
        onClose={() => setFreeOpen(false)}
        onSaved={() => {
          setFreeOpen(false);
          setSavedMsg(
            navigator.onLine
              ? '✓ Entrenamiento registrado.'
              : '✓ Guardado en el celular. Se envía al volver internet.',
          );
        }}
      />
    </>
  );
}

function WorkoutList({ items, onMenu }: { items: Workout[]; onMenu: (w: Workout) => void }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((w) => (
        <li key={w.id}>
          <button
            type="button"
            onClick={() => onMenu(w)}
            className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:border-gold/50"
          >
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-strong"
              aria-hidden
            >
              {w.is_template ? (
                <LayoutTemplate className="size-5" />
              ) : (
                <CalendarClock className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display font-semibold">{w.name}</span>
              <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                {w.scheduled_for && <span>{scheduledLabel(w.scheduled_for)}</span>}
                {w.est_minutes && <span>{w.est_minutes} min</span>}
                {w.objective && <span className="truncate">{w.objective}</span>}
              </span>
            </span>
            {w.scheduled_for && !w.is_template && <Badge tone="gold">Programado</Badge>}
            <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
