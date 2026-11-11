import { useState } from 'react';
import {
  Award,
  Check,
  ClipboardCheck,
  Flag,
  Medal,
  Minus,
  Moon,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { ProgressBar } from '@/components/ui/Progress';
import { EmptyState } from '@/components/feedback/EmptyState';
import {
  achievements as computeAchievements,
  computePoints,
  levelFor,
} from '@/features/progress/logic';
import { useProgressData } from '@/features/progress/useProgressData';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { parseDateOnly } from '@/features/players/format';
import { relativeDay } from '@/features/training/format';
import {
  dimensionLabels,
  goalKeys,
  removeAssessment,
  updateGoal,
  type Goal,
} from '@/features/goals/api';
import { useAssessments, useGoals } from '@/features/goals/hooks';
import { AssessmentSheet, GoalSheet } from '@/features/goals/GoalSheets';
import { goalStatusLabels, latestByDimension, statusForProgress } from '@/features/goals/logic';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Tab = 'goals' | 'assessments' | 'achievements';

const pointSources = [
  { label: 'Registrar entrenamientos y partidos', icon: Award },
  { label: 'Completar objetivos y aprender habilidades', icon: Flag },
  { label: 'Mantener la constancia y reflexionar', icon: Sparkles },
  { label: 'Descansar y recuperarse también suma', icon: Moon },
];

const examples = [
  'Mejorar control con la pierna menos hábil',
  'Mejorar precisión de pases',
  'Aumentar dominio de pelota',
  'Aprender conceptos tácticos',
];

export default function GoalsPage() {
  useDocumentTitle('Objetivos');
  const [tab, setTab] = useState<Tab>('goals');
  const { isAdmin } = useAuth();
  const player = usePlayer();
  const queryClient = useQueryClient();
  const progress = useProgressData();
  const points = computePoints(progress.input);
  const level = levelFor(points);
  const medals = computeAchievements(progress.input);
  const goals = useGoals();
  const assessments = useAssessments();
  const [goalSheet, setGoalSheet] = useState(false);
  const [assessSheet, setAssessSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGoals = () => queryClient.invalidateQueries({ queryKey: goalKeys.goals(player.id) });
  const refreshAssessments = () =>
    queryClient.invalidateQueries({ queryKey: goalKeys.assessments(player.id) });
  const run = async (fn: () => Promise<void>, refresh: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  const setProgress = (g: Goal, progress: number) =>
    run(() => updateGoal(g.id, { progress, status: statusForProgress(progress) }), refreshGoals);

  const active = (goals.data ?? []).filter((g) => g.status !== 'completed');
  const done = (goals.data ?? []).filter((g) => g.status === 'completed');
  const latest = latestByDimension(assessments.data ?? []);

  return (
    <>
      <PageHeader
        eyebrow="Objetivos y logros"
        title="Objetivos"
        description="Metas personales, evaluaciones físicas y reconocimientos."
        action={
          tab === 'goals' ? (
            <Button
              size="sm"
              onClick={() => setGoalSheet(true)}
              leadingIcon={<Plus className="size-4" />}
            >
              {isAdmin ? 'Nuevo' : 'Proponer'}
            </Button>
          ) : tab === 'assessments' && isAdmin ? (
            <Button
              size="sm"
              onClick={() => setAssessSheet(true)}
              leadingIcon={<Plus className="size-4" />}
            >
              Evaluar
            </Button>
          ) : undefined
        }
      />

      {/* Nivel: comienza en cero de verdad (los puntos llegan en la Fase 6). */}
      <Card tone="dark" className="flex items-center gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full bg-coal-2 text-gold ring-1 ring-gold/40"
          aria-hidden
        >
          <Medal className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-gold">Nivel {level.index}</p>
          <p className="font-display text-lg font-semibold">{level.name}</p>
          <ProgressBar
            tone="dark"
            value={level.pct}
            label="Experiencia para el próximo nivel"
            className="mt-2"
          />
          <p className="mt-1.5 text-xs text-fog">
            {points} puntos ·{' '}
            {level.next ? `faltan ${level.toNext} para ${level.next}` : 'nivel máximo'}. Se ganan
            con constancia, no con cantidad.
          </p>
        </div>
      </Card>

      <Segmented<Tab>
        className="mt-5"
        label="Ver"
        idPrefix="goals"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'goals', label: 'Objetivos' },
          { value: 'assessments', label: 'Evaluaciones' },
          { value: 'achievements', label: 'Logros' },
        ]}
      />

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[12px] bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      {tab === 'goals' && (
        <div role="tabpanel" id="goals-panel-goals" aria-labelledby="goals-tab-goals">
          <Section title="En curso">
            {goals.isPending ? (
              <LoadingState rows={2} />
            ) : goals.isError && !goals.data ? (
              <ErrorState
                description={friendlyError(goals.error)}
                onRetry={() => void goals.refetch()}
              />
            ) : active.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Flag className="size-6" />}
                  title="Todavía no hay objetivos"
                  description="Cada objetivo tiene descripción, fecha, progreso y estado: pendiente, en curso o completado."
                />
              </Card>
            ) : (
              <ul className="flex flex-col gap-3">
                {active.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    isAdmin={isAdmin}
                    onProgress={(p) => void setProgress(g, p)}
                    onApprove={() =>
                      void run(() => updateGoal(g.id, { approved: true }), refreshGoals)
                    }
                    onRemove={() =>
                      void run(() => updateGoal(g.id, { removed: true }), refreshGoals)
                    }
                  />
                ))}
              </ul>
            )}
          </Section>
          {done.length > 0 && (
            <Section title="Completados">
              <ul className="flex flex-col gap-3">
                {done.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    isAdmin={isAdmin}
                    onProgress={(p) => void setProgress(g, p)}
                    onApprove={() =>
                      void run(() => updateGoal(g.id, { approved: true }), refreshGoals)
                    }
                    onRemove={() =>
                      void run(() => updateGoal(g.id, { removed: true }), refreshGoals)
                    }
                  />
                ))}
              </ul>
            </Section>
          )}
          {(goals.data ?? []).length === 0 && (
            <Section title="Ideas para empezar">
              <ul className="flex flex-col gap-2">
                {examples.map((e) => (
                  <li
                    key={e}
                    className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-sm"
                  >
                    <Sparkles className="size-4 shrink-0 text-gold-strong" aria-hidden />
                    {e}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {tab === 'assessments' && (
        <div role="tabpanel" id="goals-panel-assessments" aria-labelledby="goals-tab-assessments">
          <Section title="Última evaluación por capacidad">
            {assessments.isPending ? (
              <LoadingState rows={2} />
            ) : assessments.isError && !assessments.data ? (
              <ErrorState
                description={friendlyError(assessments.error)}
                onRetry={() => void assessments.refetch()}
              />
            ) : latest.size === 0 ? (
              <Card>
                <EmptyState
                  icon={<ClipboardCheck className="size-6" />}
                  title="Todavía no hay evaluaciones"
                  description={
                    isAdmin
                      ? 'Cargá pruebas de control, pase, velocidad, resistencia, coordinación o visión de juego.'
                      : 'Papá carga las pruebas físicas y acá ves tu evolución.'
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[...latest.entries()].map(([dim, { latest: a, delta }]) => (
                  <Card key={dim}>
                    <p className="eyebrow">{dimensionLabels[dim]}</p>
                    <p className="mt-1 font-display text-2xl font-semibold tabular">
                      {a.score !== null ? `${a.score}/10` : `${a.value} ${a.unit ?? ''}`}
                    </p>
                    <p className="text-xs text-muted">{a.test_name}</p>
                    {delta !== null && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium">
                        {delta > 0 ? (
                          <TrendingUp className="size-3.5 text-success" aria-hidden />
                        ) : delta < 0 ? (
                          <TrendingDown className="size-3.5 text-danger" aria-hidden />
                        ) : (
                          <Minus className="size-3.5" aria-hidden />
                        )}
                        {delta > 0 ? `+${delta}` : delta} desde la anterior
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Section>
          {(assessments.data ?? []).length > 0 && (
            <Section title="Historial">
              <Card padded={false}>
                <ul className="divide-y divide-line">
                  {assessments.data!.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{a.test_name}</span>
                        <span className="block text-xs text-muted">
                          {dimensionLabels[a.dimension]} ·{' '}
                          {relativeDay(parseDateOnly(a.assessed_on))}
                          {a.value !== null ? ` · ${a.value} ${a.unit ?? ''}` : ''}
                          {a.score !== null ? ` · ${a.score}/10` : ''}
                        </span>
                        {a.notes && <span className="block text-xs">{a.notes}</span>}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          aria-label={`Quitar evaluación ${a.test_name}`}
                          className="rounded-full p-2 text-muted hover:bg-sand"
                          onClick={() => void run(() => removeAssessment(a.id), refreshAssessments)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          )}
        </div>
      )}

      {tab === 'achievements' && (
        <div role="tabpanel" id="goals-panel-achievements" aria-labelledby="goals-tab-achievements">
          <Section title="Mis logros">
            <ul className="grid grid-cols-2 gap-3">
              {medals.map((m) => (
                <li key={m.code}>
                  <Card className={m.earned ? 'border-gold/60' : 'opacity-60'}>
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Award
                        className={`size-4 ${m.earned ? 'text-gold-strong' : 'text-muted'}`}
                        aria-hidden
                      />
                      {m.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{m.description}</p>
                    <p className="mt-1 text-xs font-semibold">
                      {m.earned ? 'Conseguido' : 'Por conseguir'}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Cómo se ganan puntos">
            <Card padded={false}>
              <ul className="divide-y divide-line text-sm">
                {pointSources.map(({ label, icon: Icon }) => (
                  <li key={label} className="flex items-center gap-3 px-4 py-3.5">
                    <Icon className="size-5 text-gold-strong" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </Card>
            <p className="mt-3 text-xs text-muted">
              No se premia entrenar de más ni se compara con otros chicos.
            </p>
          </Section>
        </div>
      )}

      {goalSheet && (
        <GoalSheet
          open
          playerId={player.id}
          isAdmin={isAdmin}
          onClose={() => setGoalSheet(false)}
          onSaved={() => {
            setGoalSheet(false);
            void refreshGoals();
          }}
        />
      )}
      {assessSheet && (
        <AssessmentSheet
          open
          playerId={player.id}
          onClose={() => setAssessSheet(false)}
          onSaved={() => {
            setAssessSheet(false);
            void refreshAssessments();
          }}
        />
      )}
    </>
  );
}

function GoalCard({
  goal: g,
  isAdmin,
  onProgress,
  onApprove,
  onRemove,
}: {
  goal: Goal;
  isAdmin: boolean;
  onProgress: (p: number) => void;
  onApprove: () => void;
  onRemove: () => void;
}) {
  // El jugador solo puede tocar lo que propuso y papá todavía no aprobó.
  const canEdit = isAdmin || !g.approved;
  const steps = [0, 25, 50, 75, 100];
  return (
    <li>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{g.name}</p>
            {g.description && <p className="mt-0.5 text-sm text-muted">{g.description}</p>}
            {g.target_date && (
              <p className="mt-0.5 text-xs text-muted">
                Para el {relativeDay(parseDateOnly(g.target_date))}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge
              tone={
                g.status === 'completed'
                  ? 'success'
                  : g.status === 'in_progress'
                    ? 'gold'
                    : 'neutral'
              }
            >
              {goalStatusLabels[g.status]}
            </Badge>
            {!g.approved && <Badge tone="warning">Esperando a papá</Badge>}
          </div>
        </div>
        <ProgressBar value={g.progress} label={`Progreso de ${g.name}`} className="mt-3" />
        <p className="mt-1 text-xs text-muted tabular">{g.progress}%</p>
        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {steps.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={`Marcar ${g.name} al ${p}%`}
                aria-pressed={g.progress === p}
                onClick={() => onProgress(p)}
                className={`h-9 min-w-11 rounded-[10px] border px-2 text-sm font-semibold tabular ${g.progress === p ? 'border-coal bg-coal text-gold' : 'border-line bg-surface hover:bg-sand'}`}
              >
                {p}%
              </button>
            ))}
            <span className="flex-1" />
            {isAdmin && !g.approved && (
              <Button
                size="sm"
                variant="accent"
                onClick={onApprove}
                leadingIcon={<Check className="size-4" />}
              >
                Aprobar
              </Button>
            )}
            <button
              type="button"
              aria-label={`Quitar objetivo ${g.name}`}
              onClick={onRemove}
              className="rounded-full p-2 text-muted hover:bg-sand"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </Card>
    </li>
  );
}
