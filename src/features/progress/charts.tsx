import { dimensionOrder } from './logic';
import { dimensionLabels } from '@/features/goals/api';
import type { Dimension } from '@/features/goals/api';

/** Barras simples (SVG, sin dependencias). Cada barra con su etiqueta y valor accesibles. */
export function BarChart({
  data,
  unit,
  label,
}: {
  data: { label: string; value: number }[];
  unit: string;
  label: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 320;
  const h = 140;
  const bw = w / data.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 22}`} role="img" aria-label={label} className="w-full">
        {data.map((d, i) => {
          const bh = (d.value / max) * h;
          return (
            <g key={i}>
              <title>{`${d.label}: ${d.value} ${unit}`}</title>
              <rect
                x={i * bw + 6}
                y={h - bh}
                width={bw - 12}
                height={Math.max(bh, d.value > 0 ? 2 : 0)}
                rx={4}
                className={d.value > 0 ? 'fill-gold' : 'fill-line'}
              />
              <text
                x={i * bw + bw / 2}
                y={h + 15}
                textAnchor="middle"
                className="fill-muted text-[10px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1={0} y1={h} x2={w} y2={h} className="stroke-line" />
      </svg>
      <figcaption className="sr-only">
        {data.map((d) => `${d.label}: ${d.value} ${unit}`).join('. ')}
      </figcaption>
    </figure>
  );
}

/** Línea con puntos; los huecos (null) no se unen ni se inventan. */
export function LineChart({
  data,
  label,
  min,
  max,
}: {
  data: { label: string; value: number | null }[];
  label: string;
  min: number;
  max: number;
}) {
  const w = 320;
  const h = 120;
  const x = (i: number) => (data.length === 1 ? w / 2 : 8 + (i * (w - 16)) / (data.length - 1));
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const segments: string[] = [];
  let cur: string[] = [];
  data.forEach((d, i) => {
    if (d.value === null) {
      if (cur.length) segments.push(cur.join(' '));
      cur = [];
    } else cur.push(`${x(i)},${y(d.value)}`);
  });
  if (cur.length) segments.push(cur.join(' '));
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} role="img" aria-label={label} className="w-full">
      <line x1={0} y1={h} x2={w} y2={h} className="stroke-line" />
      {segments.map((p, i) => (
        <polyline
          key={i}
          points={p}
          fill="none"
          className="stroke-gold-strong"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      ))}
      {data.map(
        (d, i) =>
          d.value !== null && (
            <circle key={i} cx={x(i)} cy={y(d.value)} r={3.5} className="fill-ink">
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          ),
      )}
      {data.map((d, i) =>
        i % Math.ceil(data.length / 6) === 0 ? (
          <text key={i} x={x(i)} y={h + 16} textAnchor="middle" className="fill-muted text-[10px]">
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Radar de capacidades (1–10). Los ejes sin evaluación no dibujan puntos. */
export function Radar({
  values,
  size = 280,
}: {
  values: Record<Dimension, number | null>;
  size?: number;
}) {
  const c = size / 2;
  const r = size / 2 - 52;
  const pt = (i: number, s: number) => {
    const a = (Math.PI * 2 * i) / dimensionOrder.length - Math.PI / 2;
    return [c + Math.cos(a) * r * s, c + Math.sin(a) * r * s] as const;
  };
  const ring = (s: number) => dimensionOrder.map((_, i) => pt(i, s).join(',')).join(' ');
  const evaluated = dimensionOrder.filter((d) => values[d] !== null);
  const shape = dimensionOrder.map((d, i) => pt(i, (values[d] ?? 0) / 10).join(',')).join(' ');
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[300px]"
      role="img"
      aria-label={`Radar de capacidades. ${evaluated.map((d) => `${dimensionLabels[d]}: ${values[d]} de 10`).join(', ') || 'Sin evaluaciones'}`}
    >
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={ring(s)} fill="none" className="stroke-line" />
      ))}
      {evaluated.length >= 3 && (
        <polygon points={shape} className="fill-gold/30 stroke-gold-strong" strokeWidth={2} />
      )}
      {dimensionOrder.map((d, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.22);
        return (
          <g key={d}>
            <line x1={c} y1={c} x2={x} y2={y} className="stroke-line" />
            {values[d] !== null && (
              <circle
                cx={pt(i, values[d]! / 10)[0]}
                cy={pt(i, values[d]! / 10)[1]}
                r={4}
                className="fill-ink"
              />
            )}
            <text
              x={lx}
              y={ly}
              textAnchor={Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end'}
              dominantBaseline="middle"
              className="fill-muted font-sans text-[11px] font-medium"
            >
              {dimensionLabels[d]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
