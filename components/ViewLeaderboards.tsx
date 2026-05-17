"use client";

import { useEffect, useState } from "react";
import { getMyLeaderboards, getLeaderboardByCode } from "@/app/actions";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { isValidShareCode, normalizeShareCode } from "@/lib/codes";
import type { Leaderboard } from "@/lib/types";

type ViewLeaderboardsProps = {
  isAuthenticated: boolean;
};

export function ViewLeaderboards({ isAuthenticated }: ViewLeaderboardsProps) {
  const [mine, setMine] = useState<Leaderboard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [external, setExternal] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadMine() {
    if (!isAuthenticated) {
      setMine([]);
      return;
    }
    const { leaderboards } = await getMyLeaderboards();
    setMine(leaderboards as Leaderboard[]);
    if (leaderboards.length > 0 && !selectedId && !external) {
      setSelectedId(leaderboards[0]!.id);
    }
  }

  useEffect(() => {
    loadMine();
  }, [isAuthenticated]);

  async function lookupCode() {
    const code = normalizeShareCode(codeInput);
    if (!isValidShareCode(code)) {
      setError("Enter a valid 6-character code (letters and numbers).");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getLeaderboardByCode(code);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setExternal(null);
      return;
    }
    setExternal(result.leaderboard as Leaderboard);
    setSelectedId(null);
  }

  const active =
    external ?? mine.find((lb) => lb.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      {!isAuthenticated && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          Sign in to see your leaderboards. You can still view any board with a
          share code below.
        </p>
      )}

      {isAuthenticated && mine.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
            Your leaderboards
          </h3>
          <div className="flex flex-wrap gap-2">
            {mine.map((lb) => (
              <button
                key={lb.id}
                type="button"
                onClick={() => {
                  setExternal(null);
                  setSelectedId(lb.id);
                  setError(null);
                }}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  selectedId === lb.id && !external
                    ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                    : "border border-slate-700 text-slate-400 hover:border-cyan-500/30"
                }`}
              >
                {lb.name}
                <span className="ml-2 font-mono text-xs opacity-60">
                  {lb.share_code}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-cyan-500/20 bg-slate-900/30 p-4">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
          View by share code
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={codeInput}
            onChange={(e) =>
              setCodeInput(normalizeShareCode(e.target.value).slice(0, 6))
            }
            className="input-futuristic w-40 font-mono tracking-widest uppercase"
            placeholder="ABC123"
            maxLength={6}
          />
          <button
            type="button"
            onClick={lookupCode}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "…" : "Open"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </section>

      {active && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-cyan-100">
            {active.name}
            {external && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                (shared)
              </span>
            )}
          </h3>
          <LeaderboardTable
            leaderboardId={active.id}
            shareCode={active.share_code}
          />
        </section>
      )}

      {isAuthenticated && mine.length === 0 && !external && (
        <p className="text-center text-sm text-slate-500">
          No leaderboards yet. Create one in the Create tab.
        </p>
      )}
    </div>
  );
}
