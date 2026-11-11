import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone = 'neutral' | 'gold' | 'dark' | 'success' | 'warning' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-sand text-muted',
  gold: 'bg-gold-soft text-gold-strong',
  dark: 'bg-coal text-gold',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
