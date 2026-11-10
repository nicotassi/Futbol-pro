import { useId, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  /** Si se indica, cada opción controla el panel `${idPrefix}-panel-${value}`. */
  idPrefix?: string;
}

/** Control segmentado accesible (patrón de pestañas WAI-ARIA). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  idPrefix,
}: SegmentedProps<T>) {
  const fallback = useId();
  const prefix = idPrefix ?? fallback;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, index: number) => {
    const last = options.length - 1;
    const keyMap: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = keyMap[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const opt = options[next];
    if (opt) {
      onChange(opt.value);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex gap-1 overflow-x-auto rounded-[14px] bg-sand p-1 [scrollbar-width:none]',
        className,
      )}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${opt.value}`}
            aria-selected={selected}
            aria-controls={idPrefix ? `${prefix}-panel-${opt.value}` : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'h-9 flex-1 shrink-0 rounded-[10px] px-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200',
              selected
                ? 'bg-surface text-ink shadow-[var(--shadow-card)]'
                : 'text-muted hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
