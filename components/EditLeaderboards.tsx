"use client";

import { useEffect, useState } from "react";
import {
  addPlayer,
  applyMatchToLeaderboard,
  deleteLeaderboard,
  getMyLeaderboards,
  getPlayers,
} from "@/app/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { applyMatch } from "@/lib/elo";
import type { EloChange } from "@/lib/elo";
import type { Leaderboard, Player } from "@/lib/types";

type EditLeaderboardsProps = {
  isAuthenticated: boolean;
};

type PendingPreview = {
  winnerId: string;
  loserId: string;
  change: EloChange;
  winnerName: string;
  loserName: string;
};

export function EditLeaderboards({ isAuthenticated }: EditLeaderboardsProps) {
  const [boards, setBoards] = useState<Leaderboard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [pending, setPending] = useState<PendingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [tableKey, setTableKey] = useState(0);

  const selected = boards.find((b) => b.id === selectedId);

  async function loadBoards() {
    const { leaderboards } = await getMyLeaderboards();
    const list = leaderboards as Leaderboard[];
    setBoards(list);
    if (list.length > 0 && !selectedId) setSelectedId(list[0]!.id);
  }

  async function loadPlayers(id: string) {
    const { players: data } = await getPlayers(id);
    setPlayers(data as Player[]);
    setWinnerId("");
    setLoserId("");
    setPending(null);
  }

  useEffect(() => {
    if (isAuthenticated) loadBoards();
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedId) loadPlayers(selectedId);
  }, [selectedId]);

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    const result = await addPlayer(selectedId, newPlayerName);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setNewPlayerName("");
      await loadPlayers(selectedId);
      setTableKey((k) => k + 1);
    }
  }

  function previewMatch() {
    if (!winnerId || !loserId || winnerId === loserId) {
      setError("Pick two different players.");
      return;
    }
    const winner = players.find((p) => p.id === winnerId);
    const loser = players.find((p) => p.id === loserId);
    if (!winner || !loser) return;

    const change = applyMatch(winner.elo, loser.elo);
    setPending({
      winnerId,
      loserId,
      change,
      winnerName: winner.name,
      loserName: loser.name,
    });
    setError(null);
  }

  async function confirmMatch() {
    if (!pending || !selectedId) return;
    setLoading(true);
    const result = await applyMatchToLeaderboard(
      selectedId,
      pending.winnerId,
      pending.loserId
    );
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPending(null);
    await loadPlayers(selectedId);
    setTableKey((k) => k + 1);
  }

  async function confirmDeleteBoard() {
    if (!selectedId) return;
    const result = await deleteLeaderboard(selectedId);
    setDeleteTarget(false);
    if (result.error) setError(result.error);
    else {
      setSelectedId(null);
      setPending(null);
      await loadBoards();
    }
  }

  if (!isAuthenticated) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
        Sign in to edit leaderboards.
      </p>
    );
  }

  if (boards.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500">
        Create a leaderboard first to unlock editing.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input-futuristic min-w-[200px]"
        >
          {boards.map((lb) => (
            <option key={lb.id} value={lb.id}>
              {lb.name} ({lb.share_code})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setDeleteTarget(true)}
          className="text-xs text-red-400/80 hover:text-red-300"
        >
          Delete this board
        </button>
      </div>

      {selected && (
        <>
          <LeaderboardTable
            key={tableKey}
            leaderboardId={selected.id}
            shareCode={selected.share_code}
          />

          <form
            onSubmit={handleAddPlayer}
            className="flex flex-wrap gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/30 p-4"
          >
            <input
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="input-futuristic flex-1 min-w-[160px]"
              placeholder="Player name"
              required
            />
            <button type="submit" disabled={loading} className="btn-primary">
              Add player
            </button>
          </form>

          <section className="rounded-xl border border-violet-500/20 bg-slate-900/30 p-4 space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Record match
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <select
                value={winnerId}
                onChange={(e) => {
                  setWinnerId(e.target.value);
                  setPending(null);
                }}
                className="input-futuristic"
              >
                <option value="">Winner…</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.elo})
                  </option>
                ))}
              </select>
              <span className="text-cyan-500/80 font-medium">beat</span>
              <select
                value={loserId}
                onChange={(e) => {
                  setLoserId(e.target.value);
                  setPending(null);
                }}
                className="input-futuristic"
              >
                <option value="">Loser…</option>
                {players
                  .filter((p) => p.id !== winnerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.elo})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={previewMatch}
                className="btn-secondary"
                disabled={players.length < 2}
              >
                Preview changes
              </button>
            </div>

            {pending && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                <p className="font-medium text-emerald-200">
                  {pending.winnerName} beats {pending.loserName}
                </p>
                <ul className="mt-2 space-y-1 text-slate-400">
                  <li>
                    <span className="text-emerald-400">{pending.winnerName}</span>
                    : +{pending.change.winnerGain} →{" "}
                    <span className="font-mono text-cyan-300">
                      {pending.change.winnerNewElo}
                    </span>
                  </li>
                  <li>
                    <span className="text-red-400">{pending.loserName}</span>: −
                    {pending.change.loserLoss} →{" "}
                    <span className="font-mono text-cyan-300">
                      {pending.change.loserNewElo}
                    </span>
                  </li>
                  <li className="text-xs text-slate-600 pt-1">
                    Winner gains more than loser loses (
                    +{pending.change.winnerGain} vs −{pending.change.loserLoss})
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={confirmMatch}
                  disabled={loading}
                  className="btn-primary mt-4"
                >
                  {loading ? "Applying…" : "Confirm changes"}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <ConfirmDialog
        open={deleteTarget}
        title="Delete leaderboard?"
        message={`"${selected?.name}" and all players will be removed.`}
        onConfirm={confirmDeleteBoard}
        onCancel={() => setDeleteTarget(false)}
      />
    </div>
  );
}
