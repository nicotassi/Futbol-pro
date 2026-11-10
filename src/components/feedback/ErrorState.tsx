import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'No pudimos cargar esta información. Revisá la conexión e intentá de nuevo.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <div
        className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger"
        aria-hidden
      >
        <AlertTriangle className="size-6" />
      </div>
      <div className="max-w-xs">
        <p className="font-display font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leadingIcon={<RotateCcw className="size-4" />}
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}
