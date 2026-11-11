import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { LogOut, UserX } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/brand/Logo';
import { friendlyError } from '@/services/errors';
import { SplashScreen } from './SplashScreen';

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <LogoMark size={56} />
      {children}
    </div>
  );
}

/** Protege rutas: exige sesión iniciada y un jugador vinculado. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, retry, signOut, signedOutManually } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <SplashScreen />;

  if (status === 'signed-out') {
    // Tras un cierre de sesión manual no se recuerda la pantalla anterior
    // (el próximo usuario puede ser otra persona).
    const state = signedOutManually ? undefined : { from: location.pathname + location.search };
    return <Navigate to="/ingresar" replace state={state} />;
  }

  if (status === 'error') {
    return (
      <CenteredMessage>
        <ErrorState
          title="No pudimos cargar tus datos"
          description={friendlyError(error)}
          onRetry={retry}
        />
      </CenteredMessage>
    );
  }

  if (status === 'no-access') {
    return (
      <CenteredMessage>
        <div className="flex flex-col items-center gap-3">
          <span
            className="grid size-14 place-items-center rounded-full bg-gold-soft text-gold-strong"
            aria-hidden
          >
            <UserX className="size-6" />
          </span>
          <h1 className="text-xl font-semibold">Tu cuenta todavía no está vinculada</h1>
          <p className="text-sm text-muted">
            Iniciaste sesión, pero tu usuario no tiene un jugador asignado. Pedile a papá que
            complete la configuración.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void signOut()}
          leadingIcon={<LogOut className="size-4" />}
        >
          Cerrar sesión
        </Button>
      </CenteredMessage>
    );
  }

  return <>{children}</>;
}
