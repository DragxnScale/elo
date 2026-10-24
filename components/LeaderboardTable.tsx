"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/lib/types";
import { getMatches, getPlayers } from "@/app/actions";
import { formatWinRate, recordsByPlayer } from "@/lib/stats";

type LeaderboardTableProps = {
  leaderboardId: string;
  shareCode?: string;
};

export function LeaderboardTable({
  leaderboardId,
  shareCode,
}: LeaderboardTableProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [records, setRecords] = useState<
    Map<string, { wins: number; losses: number }>
  >(new Map());
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ players: data }, { matches }] = await Promise.all([
      getPlayers(leaderboardId),
      getMatches(leaderboardId, 1000),
    ]);
    setPlayers(data as Player[]);
    setRecords(recordsByPlayer(matches));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`players:${leaderboardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `leaderboard_id=eq.${leaderboardId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leaderboardId]);

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 animate-pulse">
        Syncing rankings…
      </p>
    );
  }

  if (players.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No players yet. Add players in Edit Leaderboards.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-cyan-500/20">
      {shareCode && (
        <div className="border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-center">
          <span className="text-xs uppercase tracking-widest text-slate-500">
            Share code
          </span>
          <p className="font-mono text-lg tracking-[0.3em] text-cyan-300">
            {shareCode}
          </p>
        </div>
      )}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-cyan-500/20 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3 w-16">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">W–L</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">Win %</th>
            <th className="px-4 py-3 text-right">ELO</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            const record = records.get(player.id) ?? { wins: 0, losses: 0 };
            const played = record.wins + record.losses;
            return (
            <tr
              key={player.id}
              className="border-b border-slate-800/80 transition-colors hover:bg-cyan-500/5"
            >
              <td className="px-4 py-3 font-mono text-cyan-500/80">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-medium text-slate-100">
                <Link href={`/p/${player.id}`} className="hover:underline">
                  {player.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-300">
                {record.wins}–{record.losses}
              </td>
              <td className="hidden px-4 py-3 text-right font-mono text-slate-400 sm:table-cell">
                {formatWinRate(played ? record.wins / played : null)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-cyan-300">
                {player.elo}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-2 text-center text-[10px] uppercase tracking-widest text-emerald-500/70">
        Live · updates automatically
      </p>
    </div>
  );
}
