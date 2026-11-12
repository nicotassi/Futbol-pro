import { Timer } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/authContext';
import { friendlyError } from '@/services/errors';
import { useSessions } from '@/features/training/hooks';
import { SessionList } from '@/features/training/SessionList';
import { weeklySummary } from '@/features/training/format';

export default function SessionHistoryPage() {
  useDocumentTitle('Historial de entrenamientos');
  const { isAdmin } = useAuth();
  const sessions = useSessions();
  const week = weeklySummary(sessions.data ?? []);
  return (
    <>
      <TopBar title="Historial" backTo="/entrenar" />
      <PageHeader title="Historial" description="Todas las sesiones registradas." />
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatTile label="Sesiones esta semana" value={sessions.data ? week.sessions : null} />
        <StatTile
          label="Minutos esta semana"
          value={sessions.data ? week.minutes : null}
          unit="min"
        />
      </div>
      {sessions.isPending && !sessions.data ? (
        <LoadingState rows={4} />
      ) : sessions.isError && !sessions.data ? (
        <ErrorState
          description={friendlyError(sessions.error)}
          onRetry={() => void sessions.refetch()}
        />
      ) : (sessions.data ?? []).length === 0 ? (
        <Card>
          <EmptyState icon={<Timer className="size-6" />} title="Sin sesiones registradas" />
        </Card>
      ) : (
        <SessionList sessions={sessions.data!} isAdmin={isAdmin} />
      )}
    </>
  );
}
