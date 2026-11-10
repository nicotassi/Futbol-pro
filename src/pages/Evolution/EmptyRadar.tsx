/** Radar de habilidades sin valores: muestra los ejes, nunca puntajes inventados. */
const axes = ['Control', 'Pase', 'Velocidad', 'Resistencia', 'Coordinación', 'Visión de juego'];

export function EmptyRadar({ size = 280 }: { size?: number }) {
  const c = size / 2;
  const r = size / 2 - 52;
  const point = (i: number, scale: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [c + Math.cos(a) * r * scale, c + Math.sin(a) * r * scale] as const;
  };
  const ring = (s: number) => axes.map((_, i) => point(i, s).join(',')).join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[300px]"
      role="img"
      aria-label="Radar de habilidades sin evaluaciones registradas"
    >
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={ring(s)} fill="none" className="stroke-line" strokeWidth={1} />
      ))}
      {axes.map((label, i) => {
        const [x, y] = point(i, 1);
        const [lx, ly] = point(i, 1.22);
        return (
          <g key={label}>
            <line x1={c} y1={c} x2={x} y2={y} className="stroke-line" strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              textAnchor={Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end'}
              dominantBaseline="middle"
              className="fill-muted font-sans text-[11px] font-medium"
            >
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={c} cy={c} r={3} className="fill-gold" />
    </svg>
  );
}
