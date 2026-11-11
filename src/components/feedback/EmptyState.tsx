import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
}

/** Estado vacío: explica por qué no hay datos y qué hacer. Nunca muestra datos inventados. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'light',
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-2 py-4' : 'gap-3 py-8',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'grid place-items-center rounded-full',
            compact ? 'size-11' : 'size-14',
            tone === 'light' ? 'bg-gold-soft text-gold-strong' : 'bg-coal-2 text-gold',
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="max-w-xs">
        <p className="font-display font-semibold">{title}</p>
        {description && (
          <p className={cn('mt-1 text-sm', tone === 'light' ? 'text-muted' : 'text-fog')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
