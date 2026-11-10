import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
}

/** Filtro seleccionable (p. ej. categorías de ejercicios). */
export function Chip({ selected, icon, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
        selected ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:bg-sand',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
