import { Link } from 'react-router';
import { Activity, Dumbbell, HeartPulse, Trophy, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface QuickAction {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
}

const quickActions: QuickAction[] = [
  {
    to: '/entrenar',
    label: 'Registrar entrenamiento',
    description: 'Sesión o plantilla',
    icon: Dumbbell,
    featured: true,
  },
  {
    to: '/partidos',
    label: 'Registrar partido',
    description: 'Datos y estadísticas',
    icon: Trophy,
  },
  {
    to: '/recuperacion',
    label: 'Registrar bienestar',
    description: 'Sueño y energía',
    icon: HeartPulse,
  },
  {
    to: '/evolucion',
    label: 'Ver evolución',
    description: 'Gráficos y tendencias',
    icon: Activity,
  },
];

export function QuickActions() {
  const visible = quickActions;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {visible.map(({ to, label, description, icon: Icon, featured }) => (
        <li key={to} className={cn(featured && 'col-span-2 sm:col-span-1')}>
          <Link
            to={to}
            className={cn(
              'group flex h-full min-h-[104px] flex-col justify-between gap-3 rounded-[var(--radius-card)] border p-4 transition-all duration-200 active:scale-[0.98]',
              featured
                ? 'border-gold/50 bg-gradient-to-br from-gold-light to-gold text-coal shadow-[var(--shadow-card)] hover:brightness-105'
                : 'border-line bg-surface shadow-[var(--shadow-card)] hover:border-gold/50',
            )}
          >
            <span
              className={cn(
                'grid size-10 place-items-center rounded-full',
                featured ? 'bg-coal text-gold' : 'bg-gold-soft text-gold-strong',
              )}
              aria-hidden
            >
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <span>
              <span className="block font-display text-[0.9375rem] leading-tight font-semibold">
                {label}
              </span>
              <span
                className={cn('mt-0.5 block text-xs', featured ? 'text-coal/70' : 'text-muted')}
              >
                {description}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
