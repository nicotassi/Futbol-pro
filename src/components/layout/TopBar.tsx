import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/utils/cn';

interface TopBarProps {
  title: string;
  /** Ruta a la que vuelve si no hay historial previo (p. ej. al abrir un enlace directo). */
  backTo?: string;
  actions?: ReactNode;
  className?: string;
}

/** Barra superior de pantallas secundarias, con botón atrás. */
export function TopBar({ title, backTo = '/', actions, className }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    // location.key === 'default' indica que es la primera entrada del historial.
    if (location.key !== 'default') navigate(-1);
    else navigate(backTo, { replace: true });
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-20 -mx-4 mb-2 flex h-14 items-center gap-1 bg-paper/90 px-2 backdrop-blur-md pt-safe sm:-mx-6 sm:px-4 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none',
        className,
      )}
    >
      <IconButton label="Volver" icon={<ChevronLeft className="size-6" />} onClick={goBack} />
      <p className="flex-1 truncate font-display text-base font-semibold">{title}</p>
      {actions}
    </div>
  );
}
