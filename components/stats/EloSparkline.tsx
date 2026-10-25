import { Section } from "@/components/ui/section";
import { Delta } from "@/components/ui/stat";

/** Rating over time as one dependency-free SVG line. Hidden under 2 matches. */
export function EloSparkline({
  series,
  boardName,
}: {
  series: number[];
  boardName?: string;
}) {
  if (series.length < 3) return null;

  const width = 600;
  const height = 120;
  const pad = 6;
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;

  const points = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = span === 0 ? height / 2 : pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <Section
      title="Rating history"
      description={boardName ? `Most active board: ${boardName}` : undefined}
    >
      <figure>
        <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
          <span>
            {first}
            <span aria-hidden> → </span>
            <span className="sr-only"> to </span>
            {last} <Delta value={last - first} />
          </span>
          <span>
            Range {min}
            <span aria-hidden>–</span>
            <span className="sr-only"> to </span>
            {max}
          </span>
        </figcaption>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-3 h-24 w-full text-foreground sm:h-28"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Rating went from ${first} to ${last} over ${series.length - 1} matches`}
        >
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </figure>
    </Section>
  );
}
