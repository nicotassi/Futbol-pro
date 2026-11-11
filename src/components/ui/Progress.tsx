import { cn } from '@/utils/cn';

interface ProgressProps {
  /** 0 a 100 */
  value: number;
  label: string;
  className?: string;
  tone?: 'light' | 'dark';
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export function ProgressBar({ value, label, className, tone = 'light' }: ProgressProps) {
  const v = clamp(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full',
        tone === 'light' ? 'bg-sand' : 'bg-coal-3',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-light to-gold transition-[width] duration-500"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

interface RingProps extends ProgressProps {
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  label,
  size = 72,
  stroke = 6,
  tone = 'light',
  className,
  children,
}: RingProps) {
  const v = clamp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={tone === 'light' ? 'stroke-sand' : 'stroke-coal-3'}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="stroke-gold transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
