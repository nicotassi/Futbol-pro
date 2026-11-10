import { useId } from 'react';
import { cn } from '@/utils/cn';

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Sin el fondo carbón (para usar sobre superficies oscuras). */
  bare?: boolean;
}

/** Monograma "FP": anillo dorado abierto (movimiento) + iniciales geométricas. */
export function LogoMark({ size = 40, className, bare }: LogoMarkProps) {
  const gid = useId();
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Futbolista Pro"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3C77E" />
          <stop offset="0.55" stopColor="#C9A44C" />
          <stop offset="1" stopColor="#9C7A2C" />
        </linearGradient>
      </defs>
      {!bare && <rect width="512" height="512" rx="116" fill="#16171A" />}
      <circle
        cx="256"
        cy="256"
        r="178"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="930 188"
        transform="rotate(-58 256 256)"
      />
      <g fill="none" stroke={`url(#${gid})`} strokeWidth="34">
        <path d="M176 352V176H262M176 262H246" />
        <path d="M292 352V176H322A47 47 0 0 1 322 270H292" />
      </g>
    </svg>
  );
}

interface WordmarkProps {
  tone?: 'light' | 'dark';
  className?: string;
  showTagline?: boolean;
}

/** Logotipo completo: monograma + "FUTBOLISTA PRO". */
export function Wordmark({ tone = 'light', className, showTagline }: WordmarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={34} />
      <div className="leading-none">
        <p
          className={cn(
            'font-display text-[0.9375rem] font-bold tracking-[0.14em]',
            tone === 'light' ? 'text-ink' : 'text-paper',
          )}
        >
          FUTBOLISTA <span className="text-gold">PRO</span>
        </p>
        {showTagline && (
          <p
            className={cn(
              'mt-1 text-[0.625rem] tracking-[0.18em] uppercase',
              tone === 'light' ? 'text-muted' : 'text-fog',
            )}
          >
            Entrená · Aprendé · Evolucioná
          </p>
        )}
      </div>
    </div>
  );
}
