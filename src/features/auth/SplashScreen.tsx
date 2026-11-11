import { LogoMark } from '@/components/brand/Logo';

/** Pantalla mientras se recupera la sesión guardada. */
export function SplashScreen() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center bg-ink">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={72} className="animate-shimmer" />
        <span className="sr-only">Cargando…</span>
      </div>
    </div>
  );
}
