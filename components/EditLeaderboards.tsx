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
import { calculateEloChange } from "@/lib/elo";
import type { EloChangeResult } from "@/lib/elo";
import {
  formatPointsLabel,
  parseIntegerText,
  sanitizeIntegerInput,
  validateIntegerText,
  validateRequiredText,
  type MatchFieldErrors,
} from "@/lib/match-scores";
import type { Leaderboard, Player } from "@/lib/types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}

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
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [player1Points, setPlayer1Points] = useState("");
  const [player2Points, setPlayer2Points] = useState("");
  const [fieldErrors, setFieldErrors] = useState<MatchFieldErrors>({});
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
    setPlayer1Name("");
    setPlayer2Name("");
    setPlayer1Points("");
    setPlayer2Points("");
    setFieldErrors({});
    setPending(null);
  }

  function findPlayerByName(name: string): Player | undefined {
    const key = name.trim().toLowerCase();
    return players.find((p) => p.name.trim().toLowerCase() === key);
  }

  function validateMatchFields(): {
    errors: MatchFieldErrors;
    player1?: Player;
    player2?: Player;
    score1?: number;
    score2?: number;
  } {
    const errors: MatchFieldErrors = {};

    const name1Err = validateRequiredText(player1Name, "Player 1 name");
    const name2Err = validateRequiredText(player2Name, "Player 2 name");
    const pts1Err = validateIntegerText(player1Points, "Player 1 points");
    const pts2Err = validateIntegerText(player2Points, "Player 2 points");

    if (name1Err) errors.player1Name = name1Err;
    if (name2Err) errors.player2Name = name2Err;
    if (pts1Err) errors.player1Points = pts1Err;
    if (pts2Err) errors.player2Points = pts2Err;

    const player1 = !name1Err ? findPlayerByName(player1Name) : undefined;
    const player2 = !name2Err ? findPlayerByName(player2Name) : undefined;

    if (!name1Err && !player1) {
      errors.player1Name = `"${player1Name.trim()}" is not on this leaderboard.`;
    }
    if (!name2Err && !player2) {
      errors.player2Name = `"${player2Name.trim()}" is not on this leaderboard.`;
    }
    if (
      player1 &&
      player2 &&
      player1.id === player2.id
    ) {
      errors.player2Name = "Players must be different.";
    }

    if (Object.keys(errors).length > 0) {
      return { errors };
    }

    return {
      errors: {},
      player1: player1!,
      player2: player2!,
      score1: parseIntegerText(player1Points),
      score2: parseIntegerText(player2Points),
    };
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
    const validated = validateMatchFields();
    setFieldErrors(validated.errors);

    if (
      !validated.player1 ||
      !validated.player2 ||
      validated.score1 === undefined ||
      validated.score2 === undefined
    ) {
      setPending(null);
      return;
    }

    if (validated.score1 === validated.score2) {
      setError("Tie game — no ELO change.");
      setPending(null);
      return;
    }

    const result = calculateEloChange(
      validated.player1.elo,
      validated.player2.elo,
      validated.score1,
      validated.score2
    );
    setPending({
      player1Id: validated.player1.id,
      player2Id: validated.player2.id,
      player1Name: validated.player1.name,
      player2Name: validated.player2.name,
      player1Score: validated.score1,
      player2Score: validated.score2,
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
            <p className="text-xs text-slate-500">
              Type exact player names from the board and whole-number scores.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">
                  Player 1 name
                </label>
                <input
                  type="text"
                  value={player1Name}
                  onChange={(e) => {
                    setPlayer1Name(e.target.value);
                    setPending(null);
                    setFieldErrors((prev) => ({
                      ...prev,
                      player1Name: undefined,
                    }));
                  }}
                  className="input-futuristic w-full py-3 text-base"
                  placeholder="e.g. a"
                  autoComplete="off"
                />
                <FieldError message={fieldErrors.player1Name} />
                <label className="text-xs font-medium text-slate-500">
                  Player 1 points
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={player1Points}
                  onChange={(e) => {
                    setPlayer1Points(sanitizeIntegerInput(e.target.value));
                    setPending(null);
                    setFieldErrors((prev) => ({
                      ...prev,
                      player1Points: undefined,
                    }));
                  }}
                  className="input-futuristic w-full py-3 text-base"
                  placeholder="e.g. 200"
                  autoComplete="off"
                />
                <FieldError message={fieldErrors.player1Points} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">
                  Player 2 name
                </label>
                <input
                  type="text"
                  value={player2Name}
                  onChange={(e) => {
                    setPlayer2Name(e.target.value);
                    setPending(null);
                    setFieldErrors((prev) => ({
                      ...prev,
                      player2Name: undefined,
                    }));
                  }}
                  className="input-futuristic w-full py-3 text-base"
                  placeholder="e.g. b"
                  autoComplete="off"
                />
                <FieldError message={fieldErrors.player2Name} />
                <label className="text-xs font-medium text-slate-500">
                  Player 2 points
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={player2Points}
                  onChange={(e) => {
                    setPlayer2Points(sanitizeIntegerInput(e.target.value));
                    setPending(null);
                    setFieldErrors((prev) => ({
                      ...prev,
                      player2Points: undefined,
                    }));
                  }}
                  className="input-futuristic w-full py-3 text-base"
                  placeholder="e.g. 4"
                  autoComplete="off"
                />
                <FieldError message={fieldErrors.player2Points} />
              </div>
            </div>

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

