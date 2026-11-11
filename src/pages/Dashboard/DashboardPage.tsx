import { Link } from 'react-router';
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock,
  Dumbbell,
  Flag,
  HeartPulse,
  ListChecks,
  Moon,
  Trophy,
} from 'lucide-react';
import { Wordmark } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { LinkButton } from '@/components/ui/Button';
import { Section } from '@/components/layout/Section';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { playerSubtitle } from '@/features/players/format';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { capitalize, formatLongDate, greetingFor } from '@/utils/date';
import { QuickActions } from './QuickActions';
import { PlayerAccountPrompt } from '@/features/players/PlayerAccountPrompt';

export default function DashboardPage() {
  useDocumentTitle('Inicio');
  const now = new Date();
  const player = usePlayer();
  const { profile, isAdmin } = useAuth();
  // Benja ve su propio saludo; papá ve su nombre y a quién está acompañando.
  const greetingName = isAdmin ? (profile?.display_name ?? 'Papá') : player.first_name;
  const subtitle = isAdmin
    ? `Seguimiento de ${player.first_name} · ${playerSubtitle(player)}`
    : playerSubtitle(player);

  return (
    <>
      <div className="flex h-16 items-center justify-between lg:hidden">
        <Wordmark />
        <Link to="/perfil" aria-label="Ir al perfil" className="rounded-full">
          <Avatar name={player.first_name} size="sm" />
        </Link>
      </div>

      {/* Hero: saludo + resumen semanal */}
      <Card tone="dark" className="relative mt-2 overflow-hidden lg:mt-0" padded={false}>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full border-[14px] border-gold/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-6 size-40 rounded-full border border-gold/25"
        />
        <div className="relative p-5 sm:p-6">
          <p className="text-sm text-fog">{capitalize(formatLongDate(now))}</p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-semibold text-paper sm:text-3xl">
            {greetingFor(now)}, <span className="text-gold">{greetingName}</span>
          </h1>
          <p className="mt-1 text-sm text-fog">{subtitle}</p>

          <p className="eyebrow mt-6 mb-2.5 text-gold">Esta semana</p>
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile
              tone="dark"
              label="Minutos"
              value={null}
              icon={<Clock className="size-3.5" aria-hidden />}
            />
            <StatTile
              tone="dark"
              label="Sesiones"
              value={null}
              icon={<Dumbbell className="size-3.5" aria-hidden />}
            />
            <StatTile
              tone="dark"
              label="Partidos"
              value={null}
              icon={<Trophy className="size-3.5" aria-hidden />}
            />
          </div>
          <p className="mt-3 text-xs text-fog">
            Todavía no hay actividad registrada. Los números aparecen cuando cargues tu primer
            entrenamiento.
          </p>
        </div>
      </Card>

      <PlayerAccountPrompt />

      <Section title="Accesos rápidos">
        <QuickActions isAdmin={isAdmin} />
      </Section>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            eyebrow="Último entrenamiento"
            title="Sin sesiones registradas"
            icon={
              <IconBadge>
                <Dumbbell className="size-5" />
              </IconBadge>
            }
          />
          <EmptyState
            compact
            title="Tu historial empieza acá"
            description="Cuando completes una sesión vas a ver su duración, ejercicios y esfuerzo."
            action={
              <LinkButton to="/entrenar" size="sm" variant="secondary">
                Ir a Entrenar
              </LinkButton>
            }
          />
        </Card>

        <Card>
          <CardHeader
            eyebrow="Próxima actividad"
            title="Nada programado"
            icon={
              <IconBadge>
                <CalendarClock className="size-5" />
              </IconBadge>
            }
          />
          <EmptyState
            compact
            title="Calendario libre"
            description="Entrenamientos del club, partidos y descansos se organizan en el calendario."
            action={
              <LinkButton to="/calendario" size="sm" variant="secondary">
                Abrir calendario
              </LinkButton>
            }
          />
        </Card>

        <Card>
          <CardHeader
            eyebrow="Objetivos activos"
            title="Ninguno en curso"
            icon={
              <IconBadge>
                <Flag className="size-5" />
              </IconBadge>
            }
          />
          <EmptyState
            compact
            title="¿Qué querés mejorar?"
            description="Por ejemplo: el control con la pierna menos hábil o la precisión de pase."
            action={
              <LinkButton to="/objetivos" size="sm" variant="secondary">
                Ver objetivos
              </LinkButton>
            }
          />
        </Card>

        <Card>
          <CardHeader
            eyebrow="Bienestar"
            title="Sin registros recientes"
            icon={
              <IconBadge>
                <Moon className="size-5" />
              </IconBadge>
            }
          />
          <EmptyState
            compact
            title="¿Cómo te levantaste hoy?"
            description="Sueño, energía y molestias, en menos de un minuto."
            action={
              <LinkButton to="/recuperacion" size="sm" variant="secondary">
                Registrar bienestar
              </LinkButton>
            }
          />
        </Card>
      </div>

      <Section title="Más secciones">
        <Card padded={false}>
          <ul className="divide-y divide-line">
            <MoreLink
              to="/partidos"
              icon={<Trophy className="size-5" />}
              label="Partidos"
              hint="Resultados, estadísticas y mi mejor jugada"
            />
            <MoreLink
              to="/recuperacion"
              icon={<HeartPulse className="size-5" />}
              label="Recuperación"
              hint="Semáforo de bienestar diario"
            />
            <MoreLink
              to="/calendario"
              icon={<CalendarDays className="size-5" />}
              label="Calendario"
              hint="Día, semana y mes"
            />
            <MoreLink
              to="/entrenar/ejercicios"
              icon={<ListChecks className="size-5" />}
              label="Biblioteca de ejercicios"
              hint="Seis categorías de trabajo"
            />
          </ul>
        </Card>
      </Section>
    </>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-strong"
      aria-hidden
    >
      {children}
    </span>
  );
}

function MoreLink({
  to,
  icon,
  label,
  hint,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sand/60"
      >
        <span className="text-gold-strong" aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{label}</span>
          <span className="block truncate text-xs text-muted">{hint}</span>
        </span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
