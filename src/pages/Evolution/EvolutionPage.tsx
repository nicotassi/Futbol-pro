import { useState } from 'react';
import { BarChart3, GitCompareArrows, LineChart, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { EmptyRadar } from './EmptyRadar';

type Tab = 'activity' | 'skills' | 'matches' | 'compare';

const NOT_ENOUGH = 'Todavía no hay información suficiente para establecer una tendencia.';

export default function EvolutionPage() {
  useDocumentTitle('Evolución');
  const [tab, setTab] = useState<Tab>('activity');

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
        {tab === 'activity' && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Minutos (semana)" value={null} />
              <StatTile label="Sesiones (semana)" value={null} />
              <StatTile label="Minutos (mes)" value={null} />
              <StatTile label="Sesiones (mes)" value={null} />
            </div>
            <Card>
              <CardHeader title="Tiempo por categoría" eyebrow="Actividad" />
              <EmptyState
                compact
                icon={<BarChart3 className="size-5" />}
                title="Sin entrenamientos registrados"
                description={NOT_ENOUGH}
              />
            </Card>
          </>
        )}

        {tab === 'skills' && (
          <Card>
            <CardHeader title="Radar de habilidades" eyebrow="Capacidades" />
            <EmptyRadar />
            <p className="mt-2 text-center text-sm text-muted">
              Los valores surgen únicamente de evaluaciones registradas. Todavía no hay
              evaluaciones.
            </p>
          </Card>
        )}

        {tab === 'matches' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Goles" value={null} />
              <StatTile label="Asistencias" value={null} />
              <StatTile label="Minutos" value={null} />
            </div>
            <Card>
              <EmptyState
                icon={<Trophy className="size-6" />}
                title="Sin partidos registrados"
                description={NOT_ENOUGH}
              />
            </Card>
          </>
        )}

        {tab === 'compare' && (
          <Card>
            <CardHeader title="Comparativas" eyebrow="Semana · mes · evaluaciones" />
            <EmptyState
              compact
              icon={<GitCompareArrows className="size-5" />}
              title="Nada para comparar todavía"
              description="Se necesitan al menos dos períodos con registros. No se muestran porcentajes sin datos suficientes."
            />
          </Card>
        )}

        <PhaseNotice phase={6} feature="Los gráficos de líneas, barras y radar" />
        <p className="flex items-center gap-2 text-xs text-muted">
          <LineChart className="size-4" aria-hidden />
          Tu evolución se compara solo con vos mismo.
        </p>
      </div>
    </>
  );
}
