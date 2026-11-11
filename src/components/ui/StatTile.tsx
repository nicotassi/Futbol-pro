import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface StatTileProps {
  label: string;
  /** `null` = sin registros. Nunca se inventa un valor. */
  value: number | string | null;
  unit?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
}

/** Indicador numérico. Sin datos muestra "—" en lugar de un cero engañoso. */
export function StatTile({
  label,
  value,
  unit,
  hint,
  icon,
  tone = 'light',
  className,
}: StatTileProps) {
  const empty = value === null || value === '';
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-[14px] p-3.5',
        tone === 'light' ? 'bg-sand/70' : 'bg-coal-2 ring-1 ring-coal-3',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          tone === 'light' ? 'text-muted' : 'text-fog',
        )}
      >
        {icon}
        <span>{label}</span>
      </div>
      <p className="tabular font-display text-2xl leading-none font-semibold">
        {empty ? (
          <span className={tone === 'light' ? 'text-muted' : 'text-fog'} aria-label="Sin registros">
            —
          </span>
        ) : (
          <>
            {value}
            {unit && (
              <span
                className={cn(
                  'ml-1 text-sm font-medium',
                  tone === 'light' ? 'text-muted' : 'text-fog',
                )}
              >
                {unit}
              </span>
            )}
          </>
        )}
      </p>
      {hint && (
        <p className={cn('text-xs', tone === 'light' ? 'text-muted' : 'text-fog')}>{hint}</p>
      )}
    </div>
  );
}
