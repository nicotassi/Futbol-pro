import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { GitCompareArrows, LineChart as LineIcon, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { friendlyError } from '@/services/errors';
import { seasonSummary } from '@/features/matches/stats';
import { BarChart, LineChart, Radar } from '@/features/progress/charts';
import { comparisons, periodTotals, radarValues, weeklyActivity } from '@/features/progress/logic';
import { useProgressData } from '@/features/progress/useProgressData';
import { startOfMonth, startOfWeek, addDays } from 'date-fns';
import { locale } from '@/utils/date';

type Tab = 'activity' | 'skills' | 'matches' | 'compare';
const NOT_ENOUGH = 'Todavía no hay información suficiente para establecer una tendencia.';

export default function EvolutionPage() {
  useDocumentTitle('Evolución');
  const [tab, setTab] = useState<Tab>('activity');
  const data = useProgressData();
  const now = new Date();
  const week0 = startOfWeek(now, { weekStartsOn: 1 });
  const month0 = startOfMonth(now);
  const thisWeek = periodTotals(data.sessions, week0, addDays(week0, 7));
  const thisMonth = periodTotals(
    data.sessions,
    month0,
    new Date(now.getFullYear(), now.getMonth() + 1, 1),
  );
  const weeks = weeklyActivity(data.sessions, now, 8);
  const hasActivity = weeks.some((w) => w.sessions > 0);
  const summary = seasonSummary(data.matches);
  const radar = radarValues(data.assessments);
  const hasRadar = Object.values(radar).some((v) => v !== null);
  const comps = comparisons(data.sessions, now);
  const wellness14 = [...data.wellness]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .slice(-14);
  const matchesAsc = [...data.matches]
    .sort((a, b) => a.played_on.localeCompare(b.played_on))
    .slice(-8);

  return (
    <>
      <PageHeader
        eyebrow="Rendimiento"
        title="Evolución"
        description="Tus datos convertidos en progreso visible."
      />
      <Segmented<Tab>
        label="Sección"
        idPrefix="evo"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'activity', label: 'Actividad' },
          { value: 'skills', label: 'Capacidades' },
          { value: 'matches', label: 'Partidos' },
          { value: 'compare', label: 'Comparar' },
        ]}
      />

      <div
        role="tabpanel"
        id={`evo-panel-${tab}`}
        aria-labelledby={`evo-tab-${tab}`}
        className="mt-4 flex flex-col gap-4"
      >
        {data.isPending ? (
          <LoadingState rows={3} />
        ) : data.error ? (
          <ErrorState description={friendlyError(data.error)} />
        ) : (
          <>
            {tab === 'activity' && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile
                    label="Minutos (semana)"
                    value={hasActivity ? thisWeek.minutes : null}
                  />
                  <StatTile
                    label="Sesiones (semana)"
                    value={hasActivity ? thisWeek.sessions : null}
                  />
                  <StatTile label="Minutos (mes)" value={hasActivity ? thisMonth.minutes : null} />
                  <StatTile label="Esfuerzo medio (mes)" value={thisMonth.avgRpe} unit="/10" />
                </div>
                <Card>
                  <CardHeader title="Minutos por semana" eyebrow="Últimas 8 semanas" />
                  {hasActivity ? (
                    <BarChart
                      label="Minutos entrenados por semana"
                      unit="min"
                      data={weeks.map((w) => ({
                        label: format(parseISO(w.start), 'd/M'),
                        value: w.minutes,
                      }))}
                    />
                  ) : (
                    <EmptyState
                      compact
                      title="Sin entrenamientos registrados"
                      description={NOT_ENOUGH}
                    />
                  )}
                </Card>
                <Card>
                  <CardHeader title="Bienestar" eyebrow="Horas de sueño · últimos registros" />
                  {wellness14.filter((w) => w.sleep_hours !== null).length >= 2 ? (
                    <LineChart
                      label="Horas de sueño por día"
                      min={0}
                      max={12}
                      data={wellness14.map((w) => ({
                        label: format(parseISO(w.log_date), 'd/M', { locale }),
                        value: w.sleep_hours,
                      }))}
                    />
                  ) : (
                    <EmptyState
                      compact
                      title="Faltan registros de sueño"
                      description={NOT_ENOUGH}
                    />
                  )}
                </Card>
              </>
            )}

            {tab === 'skills' && (
              <Card>
                <CardHeader title="Radar de habilidades" eyebrow="Capacidades" />
                <Radar values={radar} />
                <p className="mt-2 text-center text-sm text-muted">
                  {hasRadar
                    ? 'Muestra la última evaluación de cada capacidad (1 a 10). Las que no se evaluaron quedan vacías.'
                    : 'Los valores surgen únicamente de evaluaciones registradas. Todavía no hay evaluaciones.'}
                </p>
              </Card>
            )}

            {tab === 'matches' && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <StatTile label="Goles" value={summary.goals} />
                  <StatTile label="Asistencias" value={summary.assists} />
                  <StatTile label="Minutos" value={summary.minutes} />
                </div>
                <Card>
                  {matchesAsc.length >= 2 ? (
                    <>
                      <CardHeader title="Mi evaluación por partido" eyebrow="Escala de 1 a 5" />
                      <LineChart
                        label="Autoevaluación por partido"
                        min={1}
                        max={5}
                        data={matchesAsc.map((m) => ({
                          label: format(parseISO(m.played_on), 'd/M'),
                          value: m.reflection?.rating ?? null,
                        }))}
                      />
                    </>
                  ) : (
                    <EmptyState
                      icon={<Trophy className="size-6" />}
                      title={
                        matchesAsc.length === 0
                          ? 'Sin partidos registrados'
                          : 'Falta al menos otro partido'
                      }
                      description={NOT_ENOUGH}
                    />
                  )}
                </Card>
              </>
            )}

            {tab === 'compare' && (
              <Card>
                <CardHeader title="Comparativas" eyebrow="Semana · mes" />
                {comps.every((c) => c.changePct === null) ? (
                  <EmptyState
                    compact
                    icon={<GitCompareArrows className="size-5" />}
                    title="Nada para comparar todavía"
                    description="Se necesitan al menos dos períodos con registros. No se muestran porcentajes sin datos suficientes."
                  />
                ) : (
                  <ul className="divide-y divide-line text-sm">
                    {comps.map((c) => (
                      <li key={c.label} className="flex items-center justify-between gap-3 py-3">
                        <span>{c.label}</span>
                        <span className="text-right">
                          <span className="font-semibold tabular">
                            {c.current} <span className="text-muted">vs {c.previous}</span>
                          </span>
                          <span className="block text-xs text-muted">
                            {c.changePct === null
                              ? 'Sin base de comparación'
                              : `${c.changePct > 0 ? '+' : ''}${c.changePct}%`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </>
        )}
        <p className="flex items-center gap-2 text-xs text-muted">
          <LineIcon className="size-4" aria-hidden />
          Tu evolución se compara solo con vos mismo.
        </p>
      </div>
    </>
  );
}
