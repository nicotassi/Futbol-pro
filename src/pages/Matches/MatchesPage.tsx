import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trophy } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePlayer } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { matchKeys } from '@/features/matches/api';
import { useMatches, type MatchView } from '@/features/matches/hooks';
import { MatchList } from '@/features/matches/MatchList';
import { MatchSheet } from '@/features/matches/MatchSheet';
import { seasonSummary } from '@/features/matches/stats';

export default function MatchesPage() {
  useDocumentTitle('Partidos');
  const player = usePlayer();
  const queryClient = useQueryClient();
  const matches = useMatches();
  const [sheet, setSheet] = useState<{ match: MatchView | null } | null>(null);
  const summary = seasonSummary(matches.data ?? []);
  const has = Boolean(matches.data);

  return (
    <>
      <TopBar title="Partidos" />
      <PageHeader
        title="Partidos"
        description="Resultados, estadísticas individuales y reflexión personal."
        action={
          <Button
            size="sm"
            onClick={() => setSheet({ match: null })}
            leadingIcon={<Plus className="size-4" />}
          >
            Registrar
          </Button>
        }
      />

      <Section title="Temporada">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Partidos" value={has && summary.matches > 0 ? summary.matches : null} />
          <StatTile label="Goles" value={summary.goals} />
          <StatTile label="Asistencias" value={summary.assists} />
          <StatTile label="Minutos" value={summary.minutes} />
          <StatTile label="Pases buenos" value={summary.passAccuracy} unit="%" />
          <StatTile label="Mi evaluación" value={summary.avgRating} unit="/5" />
        </div>
        <p className="mt-2 text-xs text-muted">
          Solo se suma lo que se registró. Lo que no se cargó queda en blanco, no cuenta como cero.
        </p>
      </Section>

      <Section title="Últimos partidos">
        {matches.isPending && !matches.data ? (
          <LoadingState rows={3} />
        ) : matches.isError && !matches.data ? (
          <ErrorState
            description={friendlyError(matches.error)}
            onRetry={() => void matches.refetch()}
          />
        ) : (matches.data ?? []).length === 0 ? (
          <Card>
            <EmptyState
              icon={<Trophy className="size-6" />}
              title="Todavía no hay partidos"
              description="Fecha, rival, resultado, minutos y estadísticas cargadas a mano. Lo que no se registra, no se inventa."
              action={
                <Button size="sm" onClick={() => setSheet({ match: null })}>
                  Registrar el primero
                </Button>
              }
            />
          </Card>
        ) : (
          <MatchList matches={matches.data!} onEdit={(m) => setSheet({ match: m })} />
        )}
      </Section>

      {sheet && (
        <MatchSheet
          open
          match={sheet?.match ?? null}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            void queryClient.invalidateQueries({ queryKey: matchKeys.all(player.id) });
          }}
        />
      )}
    </>
  );
}
