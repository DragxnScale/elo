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
import { ScoreSelect } from "@/components/ScoreSelect";
import { calculateEloChange } from "@/lib/elo";
import type { EloChangeResult } from "@/lib/elo";
import {
  formatPointsLabel,
  resolveScore,
} from "@/lib/match-scores";
import type { Leaderboard, Player } from "@/lib/types";

type EditLeaderboardsProps = {
  isAuthenticated: boolean;
};

type PendingPreview = {
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  result: EloChangeResult;
};

export function EditLeaderboards({ isAuthenticated }: EditLeaderboardsProps) {
  const [boards, setBoards] = useState<Leaderboard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [player1ScoreKey, setPlayer1ScoreKey] = useState("200");
  const [player2ScoreKey, setPlayer2ScoreKey] = useState("4");
  const [player1CustomScore, setPlayer1CustomScore] = useState("");
  const [player2CustomScore, setPlayer2CustomScore] = useState("");
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
    setPlayer1Id("");
    setPlayer2Id("");
    setPlayer1ScoreKey("200");
    setPlayer2ScoreKey("4");
    setPlayer1CustomScore("");
    setPlayer2CustomScore("");
    setPending(null);
  }

  const p1 = players.find((pl) => pl.id === player1Id);
  const p2 = players.find((pl) => pl.id === player2Id);
  const resolved1 = resolveScore(player1ScoreKey, player1CustomScore);
  const resolved2 = resolveScore(player2ScoreKey, player2CustomScore);

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

  function parseScores(): { s1: number; s2: number } | null {
    if (resolved1 === null || resolved2 === null) {
      setError("Pick valid point totals for both players.");
      return null;
    }
    return { s1: resolved1, s2: resolved2 };
  }

  function previewMatch() {
    if (!player1Id || !player2Id || player1Id === player2Id) {
      setError("Pick two different players.");
      return;
    }
    const scores = parseScores();
    if (!scores) return;

    const p1 = players.find((p) => p.id === player1Id);
    const p2 = players.find((p) => p.id === player2Id);
    if (!p1 || !p2) return;

    if (scores.s1 === scores.s2) {
      setError("Tie game — no ELO change.");
      setPending(null);
      return;
    }

    const result = calculateEloChange(p1.elo, p2.elo, scores.s1, scores.s2);
    setPending({
      player1Id,
      player2Id,
      player1Name: p1.name,
      player2Name: p2.name,
      player1Score: scores.s1,
      player2Score: scores.s2,
      result,
    });
    setError(null);
  }

  async function confirmMatch() {
    if (!pending || !selectedId) return;
    setLoading(true);
    const result = await applyMatchToLeaderboard(
      selectedId,
      pending.player1Id,
      pending.player2Id,
      pending.player1Score,
      pending.player2Score
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

  function formatChange(change: number) {
    return change >= 0 ? `+${change}` : `${change}`;
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

          <section className="rounded-xl border border-violet-500/20 bg-slate-900/30 p-5 space-y-5 sm:p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Record match
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">
                  Player 1
                </label>
                <select
                  value={player1Id}
                  onChange={(e) => {
                    setPlayer1Id(e.target.value);
                    setPending(null);
                  }}
                  className="input-futuristic select-match w-full"
                >
                  <option value="">Select player…</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                      {p.name} ({p.elo} ELO)
                    </option>
                  ))}
                </select>
                <ScoreSelect
                  id="p1-points"
                  value={player1ScoreKey}
                  customValue={player1CustomScore}
                  onValueChange={(v) => {
                    setPlayer1ScoreKey(v);
                    setPending(null);
                  }}
                  onCustomChange={(v) => {
                    setPlayer1CustomScore(v);
                    setPending(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">
                  Player 2
                </label>
                <select
                  value={player2Id}
                  onChange={(e) => {
                    setPlayer2Id(e.target.value);
                    setPending(null);
                  }}
                  className="input-futuristic select-match w-full"
                >
                  <option value="">Select player…</option>
                  {players
                    .filter((p) => p.id !== player1Id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.elo} ELO)
                      </option>
                    ))}
                </select>
                <ScoreSelect
                  id="p2-points"
                  value={player2ScoreKey}
                  customValue={player2CustomScore}
                  onValueChange={(v) => {
                    setPlayer2ScoreKey(v);
                    setPending(null);
                  }}
                  onCustomChange={(v) => {
                    setPlayer2CustomScore(v);
                    setPending(null);
                  }}
                />
              </div>
            </div>

            {p1 && p2 && resolved1 !== null && resolved2 !== null && (
              <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-center text-sm text-cyan-100/90">
                <span className="font-semibold text-cyan-200">{p1.name}</span>{" "}
                with{" "}
                <span className="font-mono text-cyan-300">
                  {formatPointsLabel(resolved1)}
                </span>
                <span className="mx-2 text-slate-500">vs</span>
                <span className="font-semibold text-cyan-200">{p2.name}</span>{" "}
                with{" "}
                <span className="font-mono text-cyan-300">
                  {formatPointsLabel(resolved2)}
                </span>
              </p>
            )}

            <button
              type="button"
              onClick={previewMatch}
              className="btn-secondary w-full min-h-[3.25rem] text-base sm:w-auto sm:px-8"
              disabled={players.length < 2}
            >
              Preview changes
            </button>

            {pending && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6">
                <p className="text-lg font-semibold text-emerald-200">
                  {pending.player1Name} with{" "}
                  {formatPointsLabel(pending.player1Score)} vs{" "}
                  {pending.player2Name} with{" "}
                  {formatPointsLabel(pending.player2Score)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Score margin ×{pending.result.scoreMultiplier.toFixed(2)} ·
                  Upset ×{pending.result.upsetMultiplier.toFixed(2)}
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="flex flex-wrap items-baseline gap-2 text-base text-slate-300">
                    <span className="font-medium text-slate-200">
                      {pending.player1Name}
                    </span>
                    <span
                      className={`font-mono text-2xl font-bold ${
                        pending.result.player1Change >= 0
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {formatChange(pending.result.player1Change)}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="font-mono text-xl text-cyan-300">
                      {pending.result.player1NewElo} ELO
                    </span>
                  </li>
                  <li className="flex flex-wrap items-baseline gap-2 text-base text-slate-300">
                    <span className="font-medium text-slate-200">
                      {pending.player2Name}
                    </span>
                    <span
                      className={`font-mono text-2xl font-bold ${
                        pending.result.player2Change >= 0
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {formatChange(pending.result.player2Change)}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="font-mono text-xl text-cyan-300">
                      {pending.result.player2NewElo} ELO
                    </span>
                  </li>
                  <li className="pt-1 text-sm text-slate-500">
                    Winner gains +{pending.result.winnerGain}, loser loses −
                    {pending.result.loserLoss} (
                    {Math.round(0.75 * 100)}% of winner gain)
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={confirmMatch}
                  disabled={loading}
                  className="btn-primary mt-6 px-8 py-3 text-base"
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

