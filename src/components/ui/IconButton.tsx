import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texto accesible obligatorio (el botón solo muestra un ícono). */
  label: string;
  icon: ReactNode;
  tone?: 'light' | 'dark';
  size?: 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, tone = 'light', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-150 active:scale-95 disabled:opacity-40',
        size === 'md' ? 'size-11' : 'size-14',
        tone === 'light' ? 'text-ink hover:bg-sand' : 'text-bone hover:bg-coal-3',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});
