"use client";

import { useEffect, useRef, useState } from "react";
import { applyMatchToLeaderboard, getGamesPlayed } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Section } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { MatchPreview, describeResult } from "@/components/manage/MatchPreview";
import type { PendingPreview } from "@/components/manage/MatchPreview";
import { ScoreInput } from "@/components/manage/ScoreInput";
import { formatElo } from "@/components/manage/format";
import { calculateEloChange } from "@/lib/elo";
import {
  parseIntegerText,
  validateIntegerText,
  validatePlayerSelect,
  type MatchFieldErrors,
} from "@/lib/match-scores";
import type { Player } from "@/lib/types";

type RecordMatchProps = {
  players: Player[];
  playersLoaded: boolean;
  /** Set when the player list could not be loaded or refreshed. */
  loadError?: string;
  leaderboardId: string;
  /** Try loading the players again. */
  onRetry: () => Promise<void>;
  /** Reload players and refresh the rankings table. */
  onRecorded: () => void;
};

type Validated = {
  errors: MatchFieldErrors;
  player1?: Player;
  player2?: Player;
  score1?: number;
  score2?: number;
};

export function RecordMatch({
  players,
  playersLoaded,
  loadError,
  leaderboardId,
  onRetry,
  onRecorded,
}: RecordMatchProps) {
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [player1Points, setPlayer1Points] = useState("");
  const [player2Points, setPlayer2Points] = useState("");
  const [errors, setErrors] = useState<MatchFieldErrors>({});
  const [pending, setPending] = useState<PendingPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const player1Ref = useRef<HTMLSelectElement>(null);
  const player2Ref = useRef<HTMLSelectElement>(null);
  const points1Ref = useRef<HTMLInputElement>(null);
  const points2Ref = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // The success notice replaces the Confirm button that held focus.
  useEffect(() => {
    if (success) successRef.current?.focus();
  }, [success]);

  const canRecord = playersLoaded && !loadError && players.length >= 2;

  async function handleRetry() {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  }

  /** Any edit drops the preview and the success notice. */
  function dropResults() {
    setPending(null);
    setSuccess(null);
    setConfirmError(undefined);
  }

  function clearError(field: keyof MatchFieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): Validated {
    const next: MatchFieldErrors = {};

    const player1Err = validatePlayerSelect(player1Id, "Player 1");
    const player2Err = validatePlayerSelect(player2Id, "Player 2");
    const pts1Err = validateIntegerText(player1Points, "Player 1 points");
    const pts2Err = validateIntegerText(player2Points, "Player 2 points");

    if (player1Err) next.player1 = player1Err;
    if (player2Err) next.player2 = player2Err;
    if (pts1Err) next.player1Points = pts1Err;
    if (pts2Err) next.player2Points = pts2Err;

    const player1 = !player1Err
      ? players.find((p) => p.id === player1Id)
      : undefined;
    const player2 = !player2Err
      ? players.find((p) => p.id === player2Id)
      : undefined;

    if (player1 && player2 && player1.id === player2.id) {
      next.player2 = "Players must be different.";
    }

    if (Object.keys(next).length > 0) {
      return { errors: next };
    }

    return {
      errors: {},
      player1: player1!,
      player2: player2!,
      score1: parseIntegerText(player1Points),
      score2: parseIntegerText(player2Points),
    };
  }

  async function handlePreview() {
    setSuccess(null);
    setConfirmError(undefined);
    const validated = validate();
    setErrors(validated.errors);

    if (
      !validated.player1 ||
      !validated.player2 ||
      validated.score1 === undefined ||
      validated.score2 === undefined
    ) {
      setPending(null);
      // First invalid control in visual order.
      const { errors: e } = validated;
      if (e.player1) player1Ref.current?.focus();
      else if (e.player1Points) points1Ref.current?.focus();
      else if (e.player2) player2Ref.current?.focus();
      else if (e.player2Points) points2Ref.current?.focus();
      return;
    }

    // Experience cushions losses, so the preview needs games played. A failed
    // lookup previews as if both were new; the database computes the real
    // change when the match is confirmed either way.
    const { player1, player2, score1, score2 } = validated;
    setPreviewing(true);
    const played = await getGamesPlayed(leaderboardId).catch(() => ({ games: {} as Record<string, number> }));
    setPreviewing(false);
    setPending({
      player1Id: player1.id,
      player2Id: player2.id,
      player1Name: player1.name,
      player2Name: player2.name,
      player1Score: score1,
      player2Score: score2,
      result: calculateEloChange(player1.elo, player2.elo, score1, score2, {
        player1: played.games[player1.id] ?? 0,
        player2: played.games[player2.id] ?? 0,
      }),
    });
  }

  async function handleConfirm() {
    if (!pending) return;
    setApplying(true);
    setConfirmError(undefined);
    const result = await applyMatchToLeaderboard(
      leaderboardId,
      pending.player1Id,
      pending.player2Id,
      pending.player1Score,
      pending.player2Score
    );
    setApplying(false);
    if (result.error) {
      setConfirmError(result.error);
      return;
    }
    setSuccess(describeResult(pending));
    setPending(null);
    setPlayer1Id("");
    setPlayer2Id("");
    setPlayer1Points("");
    setPlayer2Points("");
    setErrors({});
    onRecorded();
  }

  function handleEdit() {
    setPending(null);
    setConfirmError(undefined);
    points1Ref.current?.focus();
  }

  function playerOptions(otherId: string) {
    return players.map((pl) => (
      <option key={pl.id} value={pl.id} disabled={pl.id === otherId}>
        {pl.name} ({formatElo(pl.elo)} ELO)
      </option>
    ));
  }

  return (
    <Section
      title="Record a match"
      description="Whole numbers; negatives allowed."
    >
      {success && (
        <Notice
          ref={successRef}
          tabIndex={-1}
          tone="success"
          title="Match recorded"
        >
          {success}. The table is updated.
        </Notice>
      )}
      {loadError && (
        <div className="space-y-3">
          <Notice tone="error" title="Couldn't load the players">
            {loadError}
          </Notice>
          <Button
            variant="secondary"
            loading={retrying}
            onClick={handleRetry}
          >
            {retrying ? "Trying…" : "Try again"}
          </Button>
        </div>
      )}
      {playersLoaded && !loadError && players.length < 2 && (
        <Notice tone="info">
          Add at least two players to record a match. Use “Add player” below.
        </Notice>
      )}
      <fieldset disabled={!canRecord} className="min-w-0 border-0 p-0">
        {/* inert, not disabled, while a confirm is in flight: the fields stay
            at full strength instead of flashing dim for a quick request. */}
        <div inert={applying} className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
          <div className="space-y-4">
            <Field label="Player 1" error={errors.player1}>
              <Select
                ref={player1Ref}
                size="lg"
                value={player1Id}
                onChange={(e) => {
                  setPlayer1Id(e.target.value);
                  dropResults();
                  clearError("player1");
                }}
              >
                <option value="">Select a player</option>
                {playerOptions(player2Id)}
              </Select>
            </Field>
            <ScoreInput
              playerLabel="Player 1"
              value={player1Points}
              inputRef={points1Ref}
              onEnter={() => player2Ref.current?.focus()}
              error={errors.player1Points}
              onChange={(value) => {
                setPlayer1Points(value);
                dropResults();
                clearError("player1Points");
              }}
            />
          </div>
          <div className="space-y-4">
            <Field label="Player 2" error={errors.player2}>
              <Select
                ref={player2Ref}
                size="lg"
                value={player2Id}
                onChange={(e) => {
                  setPlayer2Id(e.target.value);
                  dropResults();
                  clearError("player2");
                }}
              >
                <option value="">Select a player</option>
                {playerOptions(player1Id)}
              </Select>
            </Field>
            <ScoreInput
              playerLabel="Player 2"
              value={player2Points}
              inputRef={points2Ref}
              enterKeyHint="done"
              onEnter={() => points2Ref.current?.blur()}
              error={errors.player2Points}
              onChange={(value) => {
                setPlayer2Points(value);
                dropResults();
                clearError("player2Points");
              }}
            />
          </div>
        </div>

        <div className="mt-6">
          {pending ? (
            <MatchPreview
              pending={pending}
              loading={applying}
              error={confirmError}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
            />
          ) : (
            <Button
              size="lg"
              className="w-full sm:w-auto sm:min-w-40"
              loading={previewing}
              onClick={handlePreview}
            >
              Preview
            </Button>
          )}
        </div>
      </fieldset>
    </Section>
  );
}
