import { NavLink } from 'react-router';
import { CalendarDays, HeartPulse, Trophy, Watch } from 'lucide-react';
import { mainNav, type NavItem } from '@/config/navigation';
import { Wordmark } from '@/components/brand/Logo';
import { useAuth } from '@/contexts/authContext';
import { cn } from '@/utils/cn';

const secondary: (NavItem & { adminOnly?: boolean })[] = [
  { to: '/partidos', label: 'Partidos', icon: Trophy },
  { to: '/recuperacion', label: 'Recuperación', icon: HeartPulse },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/reloj', label: 'Registro del reloj', icon: Watch, adminOnly: true },
];

function Item({ to, label, icon: Icon, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex h-11 items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-colors',
          isActive ? 'bg-ink-2 text-paper' : 'text-fog hover:bg-ink-2 hover:text-paper',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden className={cn('size-5', isActive && 'text-gold')} strokeWidth={1.9} />
          {label}
        </>
      )}
    </NavLink>
  );
}

/** Barra lateral para pantallas anchas (≥ 1024 px). */
export function SideNav() {
  const { isAdmin } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink px-4 py-6 lg:flex">
      <Wordmark tone="dark" className="px-2" />
      <nav aria-label="Navegación principal" className="mt-8 flex flex-col gap-1">
        {mainNav.map((item) => (
          <Item key={item.to} {...item} />
        ))}
      </nav>
      <p className="eyebrow mt-8 mb-2 px-3 text-fog/80">Registros</p>
      <nav aria-label="Secciones" className="flex flex-col gap-1">
        {secondary
          .filter((item) => isAdmin || !item.adminOnly)
          .map((item) => (
            <Item key={item.to} {...item} />
          ))}
      </nav>
      <p className="mt-auto px-3 text-[0.5625rem] tracking-[0.14em] whitespace-nowrap text-fog/80 uppercase">
        Entrená · Aprendé · Evolucioná
      </p>
    </aside>
  );
}
