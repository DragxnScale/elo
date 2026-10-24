/** Rating over time as a dependency-free SVG line. */
export function EloSparkline({ series }: { series: number[] }) {
  if (series.length < 2) return null;

  const width = 600;
  const height = 120;
  const pad = 6;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;

  const points = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <figure className="rounded-xl border border-slate-800 p-4">
      <figcaption className="mb-2 flex justify-between text-xs text-slate-500">
        <span>Rating history</span>
        <span className="font-mono tabular-nums">
          {min} – {max}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Rating went from ${series[0]} to ${series[series.length - 1]} over ${series.length - 1} matches`}
      >
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className="text-cyan-400"
        />
      </svg>
    </figure>
  );
}
