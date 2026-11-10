import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type CardTone = 'light' | 'dark' | 'gold' | 'plain';

const tones: Record<CardTone, string> = {
  light: 'bg-surface border border-line shadow-[var(--shadow-card)]',
  dark: 'bg-ink text-paper border border-ink-3',
  gold: 'bg-gold-soft border border-gold/40',
  plain: 'bg-transparent border border-line',
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  tone?: CardTone;
  padded?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}

export function Card({ tone = 'light', padded = true, as = 'div', className, ...rest }: CardProps) {
  const Tag: ElementType = as;
  return (
    <Tag
      className={cn('rounded-[var(--radius-card)]', tones[tone], padded && 'p-4 sm:p-5', className)}
      {...rest}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({ title, eyebrow, action, icon, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-0.5 text-muted">{eyebrow}</p>}
          <h3 className="truncate text-base font-semibold">{title}</h3>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
