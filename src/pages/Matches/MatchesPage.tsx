import { Plus, Sparkles, Trophy } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const reflection = [
  '¿Cómo me sentí físicamente?',
  '¿Cómo estuvo mi concentración?',
  '¿Tomé buenas decisiones?',
  '¿Me ofrecí para recibir la pelota?',
  '¿Ayudé al equipo a recuperar?',
];

export default function MatchesPage() {
  useDocumentTitle('Partidos');
  return (
    <>
      <TopBar title="Partidos" />
      <PageHeader
        title="Partidos"
        description="Resultados, estadísticas individuales y reflexión personal."
        action={
          <Button size="sm" disabled leadingIcon={<Plus className="size-4" />}>
            Registrar
          </Button>
        }
      />
      <PhaseNotice phase={4} feature="El registro de partidos" />

      <Section title="Temporada">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Partidos" value={null} />
          <StatTile label="Goles" value={null} />
          <StatTile label="Asistencias" value={null} />
        </div>
      </Section>

      <Section title="Últimos partidos">
        <Card>
          <EmptyState
            icon={<Trophy className="size-6" />}
            title="Todavía no hay partidos"
            description="Fecha, rival, resultado, minutos y estadísticas cargadas a mano. Lo que no se registra, no se inventa."
          />
        </Card>
      </Section>

      <Section title="Después de cada partido">
        <Card tone="gold">
          <p className="eyebrow text-gold-strong">Evaluación personal</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {reflection.map((q) => (
              <li key={q} className="flex gap-2">
                <span className="text-gold-strong" aria-hidden>
                  ·
                </span>
                {q}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-gold-strong" aria-hidden />Y “Mi mejor jugada”, con
            foto o video.
          </p>
        </Card>
      </Section>
    </>
  );
}
