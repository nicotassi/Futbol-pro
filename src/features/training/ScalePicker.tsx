import { cn } from '@/utils/cn';

interface Props {
  label: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number | null) => void;
  labels?: Record<number, string>;
}

/** Escala de botones (1–5, 1–10) accesible como grupo de opciones. */
export function ScalePicker({ label, min, max, value, onChange, labels }: Props) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={labels?.[n] ? `${n}: ${labels[n]}` : String(n)}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              'grid h-10 min-w-10 place-items-center rounded-[10px] border px-2 text-sm font-semibold tabular transition-colors',
              value === n
                ? 'border-coal bg-coal text-gold'
                : 'border-line bg-surface hover:bg-sand',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1 min-h-4 text-xs text-muted">{value !== null && labels?.[value]}</p>
    </fieldset>
  );
}
