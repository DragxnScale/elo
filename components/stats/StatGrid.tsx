import { formatRatio, formatWinRate, type PlayerStats } from "@/lib/stats";

export function StatGrid({ stats, elo }: { stats: PlayerStats; elo?: number }) {
  const streak = stats.currentStreak
    ? `${stats.currentStreak.result}${stats.currentStreak.count}`
    : "—";

  const items: { label: string; value: string }[] = [
    ...(elo !== undefined ? [{ label: "Rating", value: String(elo) }] : []),
    { label: "Record", value: `${stats.wins}–${stats.losses}` },
    { label: "Win rate", value: formatWinRate(stats.winRate) },
    { label: "W/L ratio", value: formatRatio(stats.winLossRatio) },
    { label: "Streak", value: streak },
    { label: "Best streak", value: stats.longestWinStreak ? `W${stats.longestWinStreak}` : "—" },
    { label: "Peak", value: stats.peakElo === null ? "—" : String(stats.peakElo) },
    {
      label: "Avg score",
      value:
        stats.avgPointsFor === null
          ? "—"
          : `${stats.avgPointsFor.toFixed(1)}–${stats.avgPointsAgainst!.toFixed(1)}`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-[#050810] px-4 py-3">
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className="mt-1 font-mono text-xl text-slate-100 tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
