import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { TopBar } from '@/components/layout/TopBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LinkButton } from '@/components/ui/Button';

/**
 * Secciones exclusivas de papá. Es una ayuda de navegación: la protección real
 * está en la base de datos (RLS), que rechaza cualquier escritura no autorizada.
 */
export function RequireAdmin({ children, title }: { children: ReactNode; title: string }) {
  const { isAdmin } = useAuth();
  if (isAdmin) return <>{children}</>;
  return (
    <>
      <TopBar title={title} />
      <EmptyState
        className="pt-16"
        icon={<ShieldAlert className="size-6" />}
        title="Sección exclusiva de papá"
        description="Esta parte de la app es para administrar contenidos y revisar datos."
        action={
          <LinkButton to="/" variant="secondary">
            Volver al inicio
          </LinkButton>
        }
      />
    </>
  );
}
