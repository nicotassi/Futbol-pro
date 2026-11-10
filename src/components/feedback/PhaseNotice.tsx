import { Construction } from 'lucide-react';
import { phaseNames } from '@/config/phases';
import type { DevelopmentPhase } from '@/types/domain';
import { cn } from '@/utils/cn';

interface PhaseNoticeProps {
  phase: DevelopmentPhase;
  /** Qué se habilita, p. ej. "El registro de partidos". */
  feature: string;
  className?: string;
}

/**
 * Indica de forma explícita que una función todavía no está conectada.
 * Regla del proyecto: no simular funcionalidades que no existen.
 */
export function PhaseNotice({ phase, feature, className }: PhaseNoticeProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[14px] border border-dashed border-gold/60 bg-gold-soft/60 px-4 py-3 text-sm',
        className,
      )}
    >
      <Construction className="mt-0.5 size-4 shrink-0 text-gold-strong" aria-hidden />
      <p className="text-ink">
        <span className="font-semibold">{feature}</span> se habilita en la{' '}
        <span className="font-semibold text-gold-strong">
          Fase {phase} · {phaseNames[phase]}
        </span>
        .
      </p>
    </div>
  );
}
