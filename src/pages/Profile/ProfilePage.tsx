import { Link } from 'react-router';
import {
  CalendarDays,
  ChevronRight,
  HeartPulse,
  LogOut,
  Settings,
  Shield,
  Trophy,
  Watch,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { LogoMark } from '@/components/brand/Logo';
import { initialPlayer } from '@/config/player';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const links = [
  { to: '/partidos', label: 'Partidos', icon: Trophy },
  { to: '/recuperacion', label: 'Recuperación', icon: HeartPulse },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/reloj', label: 'Registro del reloj', icon: Watch },
  { to: '/admin', label: 'Administración', icon: Shield, badge: 'Papá' },
];

export default function ProfilePage() {
  useDocumentTitle('Perfil');
  return (
    <>
      <PageHeader title="Perfil" />

      <Card className="flex items-center gap-4">
        <Avatar name={initialPlayer.firstName} size="lg" />
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold">{initialPlayer.firstName}</p>
          <p className="text-sm text-muted">
            {initialPlayer.position} · {initialPlayer.ageLabel}
          </p>
          <Badge tone="gold" className="mt-2">
            Jugador
          </Badge>
        </div>
      </Card>

      <PhaseNotice
        className="mt-4"
        phase={2}
        feature="El inicio de sesión y la edición del perfil"
      />

      <Card padded={false} className="mt-5">
        <ul className="divide-y divide-line">
          {links.map(({ to, label, icon: Icon, badge }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sand/60"
              >
                <Icon className="size-5 text-gold-strong" aria-hidden />
                <span className="flex-1 font-medium">{label}</span>
                {badge && <Badge>{badge}</Badge>}
                <ChevronRight className="size-5 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-3 px-4 py-3.5 text-muted">
            <Settings className="size-5" aria-hidden />
            <span className="flex-1">Ajustes</span>
            <Badge>Fase 2</Badge>
          </li>
        </ul>
      </Card>

      <Button
        variant="secondary"
        block
        className="mt-5"
        disabled
        leadingIcon={<LogOut className="size-4" />}
      >
        Cerrar sesión
      </Button>

      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <LogoMark size={40} />
        <p className="eyebrow text-muted">Futbolista Pro · v{__APP_VERSION__}</p>
        <p className="max-w-xs text-xs text-muted">
          Aplicación privada. Sin publicidad, sin perfiles públicos y sin rankings entre chicos.
        </p>
      </div>
    </>
  );
}
