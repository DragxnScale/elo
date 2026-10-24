import Link from "next/link";
import type { HeadToHead } from "@/lib/stats";

export function HeadToHeadTable({
  rows,
  names,
}: {
  rows: HeadToHead[];
  names: Record<string, string | undefined>;
}) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-800 text-xs text-slate-500">
          <th className="py-2 font-normal">Opponent</th>
          <th className="py-2 text-right font-normal">W–L</th>
          <th className="py-2 text-right font-normal">Played</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.opponentId} className="border-b border-slate-800/60">
            <td className="py-2">
              <Link href={`/p/${r.opponentId}`} className="text-slate-100 hover:underline">
                {names[r.opponentId] ?? "Unknown"}
              </Link>
            </td>
            <td className="py-2 text-right font-mono tabular-nums text-slate-300">
              {r.wins}–{r.losses}
            </td>
            <td className="py-2 text-right font-mono tabular-nums text-slate-500">{r.played}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
