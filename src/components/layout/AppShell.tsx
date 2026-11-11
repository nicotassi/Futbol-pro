import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { ScrollToTop } from './ScrollToTop';
import { OutboxSync } from '@/features/training/OutboxSync';

/** Estructura principal: contenido + navegación (inferior en móvil, lateral en escritorio). */
export function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-dvh lg:pl-64">
      <ScrollToTop />
      <OutboxSync />
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <SideNav />
      <OfflineBanner />
      <main
        id="contenido"
        key={location.pathname}
        className="animate-enter mx-auto w-full max-w-3xl px-4 pb-safe-nav max-lg:pt-safe-3 sm:px-6 lg:max-w-5xl lg:px-10 lg:pt-8 lg:pb-12"
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
