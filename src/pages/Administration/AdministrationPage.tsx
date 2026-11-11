import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ClipboardCheck,
  Download,
  Dumbbell,
  FileText,
  Flag,
  LayoutTemplate,
  Trophy,
  User,
  Users,
  Watch,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { fetchPlayerAccess, playerKeys } from '@/features/players/api';
import { PlayerEditSheet } from '@/features/players/PlayerEditSheet';
import { friendlyError } from '@/services/errors';
import type { DevelopmentPhase } from '@/types/domain';

const upcoming: { label: string; icon: typeof User; phase: DevelopmentPhase }[] = [
  { label: 'Ejercicios', icon: Dumbbell, phase: 3 },
  { label: 'Entrenamientos y plantillas', icon: LayoutTemplate, phase: 3 },
  { label: 'Partidos', icon: Trophy, phase: 4 },
  { label: 'Objetivos', icon: Flag, phase: 4 },
  { label: 'Evaluaciones físicas y técnicas', icon: ClipboardCheck, phase: 4 },
  { label: 'Revisión de capturas del reloj', icon: Watch, phase: 5 },
  { label: 'Historial completo', icon: FileText, phase: 6 },
  { label: 'Exportar información', icon: Download, phase: 7 },
];

export default function AdministrationPage() {
  useDocumentTitle('Administración');
  const player = usePlayer();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const access = useQuery({
    queryKey: playerKeys.access(player.id),
    queryFn: () => fetchPlayerAccess(player.id),
  });

  return (
    <>
      <TopBar title="Administración" backTo="/perfil" />
      <PageHeader
        eyebrow="Solo papá"
        title="Administración"
        description="Gestión de contenidos, revisiones y configuración."
      />

      <Card padded={false}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-sand/60"
        >
          <User className="size-5 text-gold-strong" aria-hidden />
          <span className="flex-1">
            <span className="block font-medium">Perfil del jugador</span>
            <span className="block text-xs text-muted">
              Nombre, fecha de nacimiento, posición, club
            </span>
          </span>
          <ChevronRight className="size-5 text-muted" aria-hidden />
        </button>
      </Card>

      <Section title="Usuarios con acceso">
        <Card padded={false}>
          {access.isPending ? (
            <div className="p-4">
              <LoadingState rows={2} />
            </div>
          ) : access.isError ? (
            <ErrorState
              description={friendlyError(access.error)}
              onRetry={() => void access.refetch()}
            />
          ) : (
            <ul className="divide-y divide-line">
              {access.data.map((a) => (
                <li key={a.userId} className="flex items-center gap-3 px-4 py-3.5">
                  <Users className="size-5 text-gold-strong" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {a.displayName}
                      {a.userId === user?.id && <span className="text-muted"> (vos)</span>}
                    </span>
                    {a.username && (
                      <span className="block text-xs text-muted">Usuario: {a.username}</span>
                    )}
                  </span>
                  <Badge tone={a.role === 'admin' ? 'dark' : 'gold'}>
                    {a.role === 'admin' ? 'Administrador' : 'Jugador'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <p className="mt-2 text-xs text-muted">
          Las cuentas y contraseñas se administran con el script <code>npm run family</code> (ver
          README).
        </p>
      </Section>

      <Section title="Próximamente">
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {upcoming.map(({ label, icon: Icon, phase }) => (
              <li key={label} className="flex items-center gap-3 px-4 py-3.5 text-muted">
                <Icon className="size-5" aria-hidden />
                <span className="flex-1">{label}</span>
                <Badge>Fase {phase}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      {user && editing && (
        <PlayerEditSheet
          open={editing}
          onClose={() => setEditing(false)}
          player={player}
          userId={user.id}
        />
      )}
    </>
  );
}
