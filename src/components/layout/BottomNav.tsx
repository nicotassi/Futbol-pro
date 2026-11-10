import { NavLink } from 'react-router';
import { mainNav } from '@/config/navigation';
import { cn } from '@/utils/cn';

/** Navegación inferior fija (celulares y tablets en vertical). */
export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-surface/92 backdrop-blur-md pb-safe lg:hidden"
    >
      <ul className="mx-auto grid h-[var(--bottom-nav-height)] max-w-xl grid-cols-5">
        {mainNav.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors',
                  isActive ? 'text-ink' : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-0 h-[3px] w-8 rounded-b-full bg-gold transition-all duration-300',
                      isActive ? 'opacity-100' : 'scale-x-0 opacity-0',
                    )}
                  />
                  <Icon
                    aria-hidden
                    className={cn(
                      'size-[22px] transition-transform duration-200',
                      isActive && 'text-gold-strong',
                    )}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
