import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

const base =
  'inline-flex select-none items-center justify-center gap-2 font-display font-semibold tracking-tight ' +
  'transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-2 shadow-[var(--shadow-card)]',
  accent: 'bg-gold text-coal hover:bg-gold-light shadow-[var(--shadow-card)]',
  secondary: 'bg-surface text-ink border border-line hover:bg-sand',
  ghost: 'bg-transparent text-ink hover:bg-sand',
  danger: 'bg-danger text-white hover:brightness-110',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-[10px] px-3 text-sm',
  md: 'h-11 rounded-[var(--radius-control)] px-4 text-[0.9375rem]',
  lg: 'h-13 rounded-[14px] px-5 text-base',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block,
  className,
}: StyleProps & { className?: string }) {
  return cn(base, variants[variant], sizes[size], block && 'w-full', className);
}
