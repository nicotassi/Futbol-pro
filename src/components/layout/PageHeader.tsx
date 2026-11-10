import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, action, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1 text-gold-strong">{eyebrow}</p>}
        <h1 className="text-[1.75rem] leading-tight font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-[0.9375rem] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
