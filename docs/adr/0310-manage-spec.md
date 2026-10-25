# 310. Creating and managing boards: design spec

Status: Accepted

## Context

The Create and Edit tabs are where a board is made and where results are recorded. Recording a match is the highest-stakes interaction in BowlBoard: someone at the table, phone in one hand, often in dim light, types two scores that permanently move two people's ratings. The current implementation (`components/CreateLeaderboard.tsx`, `components/EditLeaderboards.tsx`, `components/ConfirmDialog.tsx`) uses the replaced neon look: cyan and violet bordered cards on every section, boxed red `FieldError` panels, an emerald preview panel with glowing mono figures, uppercase tracking labels, the `select-match` and `py-3 text-base` input hacks, and a fixed modal with backdrop blur and a cyan glow.

It also carries behaviour and quality problems a redesign should not copy:

- Three `react-hooks/set-state-in-effect` errors and two `exhaustive-deps` warnings (`loadBoards`, `loadPlayers`, `load` are called from effects).
- Every error from every action goes into one `error` string rendered at the bottom of the page, out of sight on a phone.
- The delete dialog message is built from `deleteTarget?.name`, so it reads "undefined" while the dialog is closing; the dialog also `return null`s when closed, so it cannot animate out.
- `inputMode="numeric"` on the score inputs gives iOS a keypad without a minus key, so the "negatives allowed" feature is unreachable on a phone.
- The starting ELO is a `number` state: clearing the field snaps it to `0`.
- The two player selects behave differently (one disables, the other filters), so the second list shifts when the first changes.
- Preview is silently disabled with fewer than two players; there is no reason given. There is no success feedback after recording a match, adding a player or creating a board.
- The Edit tab never tells the shell that the last board was deleted (`hasBoards` goes stale).

Constraints: `app/actions.ts`, `lib/**`, `app/globals.css`, `components/ui/**` and Kokonut are read-only. `LeaderboardTable` belongs to the view team and keeps its props. `ConfirmDialog` keeps its props and is used by both screens. `docs/design/DIRECTION.md` and `BRIEFS.md` are binding. This ADR records the spec in `docs/design/features/manage.md`; it contains no UI code. (The briefs file suggests ADR number 0004; the numbering for this workflow is 0310.)

## Decision

Treat Create as a short written form and Edit as a workbench ordered by how often each job happens, with the record-a-match flow built as a large, hard-to-get-wrong score sheet that ends in an explicit "here is what will happen" card. Use only the shared primitives plus a handful of local components in `components/manage/`.

**Hierarchy.** Create: New board form, then Your boards (rule-separated rows: name, mono share code with copy, muted starting ELO, quiet Delete). Edit: board selector with a quiet "Delete board", Rankings (the view team's table), Record a match, Add player, Linked accounts; each a `Section`, `space-y-10`, no stacked cards.

**Structure.** `EditLeaderboards` keeps boards, selection and delete; a new `BoardWorkbench`, rendered with `key={board.id}`, owns the players and everything below the selector. Remounting on board change resets every form, draft and preview without effects, which is also how the lint errors go away. Other new files: `RecordMatch`, `MatchPreview`, `ScoreInput`, `AddPlayer`, `LinkedAccounts` and optionally `BoardsList` and `format.ts`. Data loading uses inline async functions inside effects with a `cancelled` flag and a `reloadKey` counter for re-fetching after mutations; the default board is derived (`boards.some(...) ? selectedId : boards[0]?.id`), never synced.

**Record a match (phone first).** One column on phones, two from `sm`; each side is a unit (player Select `lg`, Points Input `lg`, 48px). Labels are visible ("Player 1", "Points" with an sr-only "for Player 1"). Both selects list all players with the other side's pick disabled. Errors use `Field error` with the validators' unchanged strings and focus moves to the first invalid control. The primary "Preview" is full width on phones and hidden once a preview exists. A tie is an inline info `Notice` ("Tie game — no ELO change.").

**Sign toggle.** Each Points input has a 48px "−" toggle (`aria-pressed`) that adds or removes a leading minus, so negatives are reachable on iOS. The input stays the single source of truth and still runs `sanitizeIntegerInput`.

**Preview and confirm.** The only `Surface` on the screen. Heading "Ana beat Ben, 21 to 17" (winner first, words not dashes so a negative never reads as a range), one rule-separated row per player (name; `1,000 → 1,012` with the new rating in semibold; a `text-3xl` `Delta`), one muted line for the multipliers, an inline error `Notice` on failure, then Confirm (primary, lg, "Applying…") and Edit scores (ghost, lg). Colour appears only in the deltas. Focus moves to the card on Preview (`scrollIntoView({ block: "nearest" })`, no smooth scroll) and to a "Match recorded" success notice after Confirm, so focus is not lost when the button unmounts.

**ConfirmDialog.** Rebuilt on `ui/dialog` with the same props plus optional `loading`. It always renders the `Dialog` (so the exit animation and focus return work), Cancel is first in the DOM (initial focus on the safe choice), the confirm is `variant="destructive"` and the only solid red in the product. Callers hold an `open` boolean and a separate `{ id, name }` snapshot so the message never reads "undefined". Body: "“Name” will be deleted for good, along with all its players and matches. This can’t be undone." Both callers pass `confirmLabel="Delete board"`; the default stays "Delete".

**Errors and feedback are local.** One message slot per section (Notice or `Field error`); the page-bottom error string is removed. Success is acknowledged where the action happened: a success `Notice` after creating a board and after recording a match, a quiet status line after adding a player, and the row flip after linking.

**Forms.** Create uses `noValidate` and our own field errors; Starting ELO is a digits-only string state parsed on submit (bounds 100–10,000 enforced on the client and still by the server). Add player has Name and an optional Account username with the linking hint. Linked accounts explains linking once at the top, then rows with a `Linked` badge and Unlink, or a per-row inline form (Enter submits) with a Link button disabled until a username is typed.

**Optional props for the shell.** `EditLeaderboards` gains optional `onCreateBoard` (empty-state action) and `onBoardsChanged` (called after a delete so `hasBoards` can refresh). Neither is required; nothing breaks if the shell never passes them.

## Consequences

- The phone flow is shorter and certain: labelled 48px controls, errors under the field, a preview that states the result in a sentence and shows every rating change before anything is saved, and a visible confirmation afterwards.
- All three owned files become lint-clean without suppressions, and form state resets are structural (keyed remount) rather than imperative.
- The visual identity matches Scorecard: no gradients, glows, uppercase labels, nested or tinted cards; colour is only on deltas, errors, the Linked badge and the destructive confirm.
- Added UI (the sign toggle, a success notice, a stated reason for a disabled Preview, focus management) is small but real; the Builder must follow the focus rules or the screen regresses for keyboard and screen-reader users.
- Remounting `LeaderboardTable` through `tableKey` after every add or confirm shows its loading skeleton briefly. It is the existing contract and guarantees a fresh table; the realtime subscription in the view team's table would also update it, so a later change could drop the key, but only after verifying that.
- The preview is computed from the ratings on screen and the server recalculates on confirm, so applied numbers can differ slightly if someone else recorded a match in between. The success copy deliberately does not repeat the numbers. Fixing this properly needs an action change (outside this team's files).
- Departures from the brief, all small and listed in section 12 of the spec: Link/Unlink at 40px (Direction principle 6) rather than 32px; Preview hidden while a preview shows; result sentence wording; the "Winner gains / 75%" line dropped; a visible "Rankings" heading; no Surface around the Create form.
- `ShareCode`'s copy button is the `sm` (32px) size and cannot be changed by this team; it is the one sub-40px target in this feature.
- Candidate primitives for the Director: `ScoreInput` (labelled signed-integer field with a sign toggle), `SignedNumberField`; a `ShareCode` `size` prop; a `ConfirmDialog` built into `ui/` as a thin wrapper over `Dialog`; a rule-separated `List`/`ListRow` (used here for boards and linked accounts, and by the stats team for matches).

## Alternatives considered

- **Keep one file per screen with all logic inline.** Rejected: `EditLeaderboards` is 569 lines with six unrelated concerns. A keyed `BoardWorkbench` is what makes effect-free state reset possible.
- **Sync form state on board change with an effect.** Rejected: it is what the lint rule is flagging. Remounting by key is simpler and correct.
- **`inputMode="text"` for scores so a minus is typeable.** Rejected: a full keyboard for the common positive case is slower for the primary flow. `inputMode="numeric"` plus a sign toggle serves both.
- **`type="number"` for scores and starting ELO.** Rejected: spinners, scroll-wheel changes and `valueAsNumber` quirks, and an unvalidated empty string; the existing sanitiser already gives better control.
- **Preview as a modal dialog.** Rejected by the Direction (modals are for auth and destructive confirms) and worse on a phone: the user needs to see the scores they typed next to the result.
- **Always-visible Preview plus a second primary Confirm.** Rejected: two competing primaries on one surface. Hiding Preview while a preview is shown gives one main action at a time.
- **Remove the 75% line but keep winner-gain text.** Rejected as redundant with the deltas.
- **A Surface around the Create form** (a "card to write a name on"). Rejected: the form is the only content on the screen, so an edge adds nothing, and it would add a second card to a feature whose one justified card is the preview.
- **A single page-level error Notice.** Rejected: on a phone the message is off-screen; per-section slots put it next to the cause.
- **Shell-side changes** (wiring the new optional props, tab refresh after delete). Out of scope for this team; the props are optional so the shell can adopt them later.
