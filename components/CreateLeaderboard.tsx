"use client";

import { useEffect, useState } from "react";
import {
  createLeaderboard,
  deleteLeaderboard,
  getMyLeaderboards,
} from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Leaderboard } from "@/lib/types";

type CreateLeaderboardProps = {
  isAuthenticated: boolean;
  onCreated: () => void;
};

export function CreateLeaderboard({
  isAuthenticated,
  onCreated,
}: CreateLeaderboardProps) {
  const [name, setName] = useState("");
  const [startingElo, setStartingElo] = useState(1000);
  const [list, setList] = useState<Leaderboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Leaderboard | null>(null);

  async function load() {
    if (!isAuthenticated) return;
    const { leaderboards } = await getMyLeaderboards();
    setList(leaderboards as Leaderboard[]);
  }

  useEffect(() => {
    load();
  }, [isAuthenticated]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setError("Sign in to create leaderboards.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createLeaderboard(name, startingElo);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setStartingElo(1000);
    await load();
    onCreated();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteLeaderboard(deleteTarget.id);
    setDeleteTarget(null);
    if (result.error) setError(result.error);
    else {
      await load();
      onCreated();
    }
  }

  if (!isAuthenticated) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
        Sign in to create and manage leaderboards.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-cyan-500/20 bg-slate-900/30 p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-cyan-100">
          New leaderboard
        </h3>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-futuristic w-full max-w-md"
            placeholder="Friday Night Pool"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Starting ELO
          </label>
          <input
            type="number"
            value={startingElo}
            onChange={(e) => setStartingElo(Number(e.target.value))}
            className="input-futuristic w-32"
            min={100}
            max={10000}
            required
          />
          <p className="mt-1 text-xs text-slate-600">
            New players begin at this rating (default 1000).
          </p>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating…" : "Create leaderboard"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>

      {list.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
            Your boards
          </h3>
          <ul className="space-y-2">
            {list.map((lb) => (
              <li
                key={lb.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-slate-200">{lb.name}</span>
                  <span className="ml-3 font-mono text-xs text-cyan-500/80">
                    {lb.share_code}
                  </span>
                  <span className="ml-2 text-xs text-slate-600">
                    start {lb.starting_elo} ELO
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(lb)}
                  className="text-xs text-red-400/80 hover:text-red-300"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete leaderboard?"
        message={`"${deleteTarget?.name}" and all its players will be permanently removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
