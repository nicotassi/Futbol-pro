import { useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarDays,
  ChevronRight,
  HeartPulse,
  LogOut,
  Pencil,
  Shield,
  Trophy,
  Watch,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/brand/Logo';
import { useAuth, usePlayer } from '@/contexts/authContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { footLabels, playerSubtitle } from '@/features/players/format';
import { PlayerEditSheet } from '@/features/players/PlayerEditSheet';
import { ThemeSwitch } from '@/features/theme/ThemeSwitch';

const links = [
  { to: '/partidos', label: 'Partidos', icon: Trophy },
  { to: '/recuperacion', label: 'Recuperación', icon: HeartPulse },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/reloj', label: 'Registro del reloj', icon: Watch, adminOnly: true },
  { to: '/admin', label: 'Administración', icon: Shield, adminOnly: true },
];

export default function ProfilePage() {
  useDocumentTitle('Perfil');
  const player = usePlayer();
  const { profile, isAdmin, user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const details = [
    ['Club', player.club],
    ['Categoría', player.category],
    ['Pierna hábil', player.dominant_foot ? footLabels[player.dominant_foot] : null],
  ].filter((d): d is [string, string] => Boolean(d[1]));

  return (
    <>
      <PageHeader title="Perfil" />

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={player.first_name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-semibold">
              {player.first_name} {player.last_name}
            </p>
            <p className="text-sm text-muted">{playerSubtitle(player)}</p>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(true)}
              leadingIcon={<Pencil className="size-4" />}
            >
              Editar
            </Button>
          )}
        </div>
        {details.length > 0 && (
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-sm">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="truncate font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card className="mt-4 flex items-center gap-3" tone="plain">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Sesión iniciada como</p>
          <p className="truncate font-medium">{profile?.display_name}</p>
          <p className="truncate text-xs text-muted">
            {profile?.username ? `Usuario: ${profile.username}` : user?.email}
          </p>
        </div>
        <Badge tone={isAdmin ? 'dark' : 'gold'}>{isAdmin ? 'Administrador' : 'Jugador'}</Badge>
      </Card>

      <Card className="mt-4">
        <p className="mb-2 font-medium">Apariencia</p>
        <ThemeSwitch />
        <p className="mt-2 text-xs text-muted">
          “Automático” usa el modo claro u oscuro de tu celular.
        </p>
      </Card>

      <Card padded={false} className="mt-5">
        <ul className="divide-y divide-line">
          {links
            .filter((l) => isAdmin || !l.adminOnly)
            .map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sand/60"
                >
                  <Icon className="size-5 text-gold-strong" aria-hidden />
                  <span className="flex-1 font-medium">{label}</span>
                  <ChevronRight className="size-5 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
        </ul>
      </Card>

      <Button
        variant="secondary"
        block
        className="mt-5"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await signOut();
        }}
        leadingIcon={<LogOut className="size-4" />}
      >
        {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </Button>

      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <LogoMark size={40} />
        <p className="eyebrow text-muted">Futbolista Pro · v{__APP_VERSION__}</p>
        <p className="max-w-xs text-xs text-muted">
          Aplicación privada. Sin publicidad, sin perfiles públicos y sin rankings entre chicos.
        </p>
      </div>

      {isAdmin && user && editing && (
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
