# 320. Manage feature build: Create, Edit and ConfirmDialog on the Scorecard primitives

Status: Accepted

## Context

The "manage" feature (Create tab, Edit tab, delete confirmation) was still on the neon cyan/violet look: bordered gradient cards on every section, boxed red error panels, an emerald preview panel with glowing mono figures, uppercase tracking labels, and the legacy `input-futuristic` / `btn-primary` / `btn-secondary` / `select-match` classes. `docs/design/features/manage.md` (ADR 0310) specifies the replacement. This ADR records how the Builder implemented it, and the places where the spec left a decision open. Behaviour was not allowed to change: sign-in-required states, create with ELO bounds 100-10000, board lists with delete-with-confirm in both tabs, board selector, add player with optional account username, link/unlink with per-player drafts, record match with every validator, preview before confirm, tie handling, live table refresh via `tableKey`.

The old files also carried three `react-hooks/set-state-in-effect` errors and two `exhaustive-deps` warnings (effects calling `load()` functions that set state; a `loadPlayers` shared by effect and handlers).

## Decision

Files: `components/ConfirmDialog.tsx`, `components/CreateLeaderboard.tsx`, `components/EditLeaderboards.tsx` rewritten; new `components/manage/` with `BoardWorkbench`, `RecordMatch`, `MatchPreview`, `ScoreInput`, `AddPlayer`, `LinkedAccounts` and `format.ts`. No other file was touched. `BoardsList.tsx` (optional in the spec) was not created: the Your-boards list is used only by Create, and Edit uses a selector, so a shared component would have had one caller.

Structure and primitives:
- **ConfirmDialog** keeps its props and adds optional `loading`. It always renders `<Dialog>` (never `null`), footer order Cancel (`secondary`) then confirm (`destructive`, `loading`), no `autoFocus`, so the native dialog's initial focus lands on Cancel. `onClose` is `onCancel`, ignored while loading.
- **CreateLeaderboard / EditLeaderboards** are thin wrappers: signed out renders a `Notice tone="info"`; signed in renders an inner panel (`CreatePanel`, `EditPanel`). Splitting this way means all state is dropped on sign-out and a different account never sees the previous account's boards, and the data effects do not need `isAuthenticated` as a dependency.
- **Starting ELO** is a string state (`"1000"`, digits only, parsed on submit), so the field can be cleared. Validation runs on submit only, messages through `Field error`, the first invalid field is focused via `ref`, and a field's error clears when it changes. The form is `noValidate`.
- **Delete flow** keeps a boolean `open` and a separate target snapshot (`Leaderboard` in Create, `{ id, name }` in Edit). The snapshot is replaced when the next target is chosen and never cleared on close, which fixes the old "undefined" in the message during the exit animation. Errors close the dialog and show a `Notice` in the section that failed (above the list in Create, under the selector row in Edit).
- **Edit** derives the selected board (`boards.find(selectedId) ?? boards[0]`), so there is no effect-synced selection and deleting the selected board falls to the first remaining one with no extra code. `<BoardWorkbench key={board.id}>` resets every form on a board switch without effects.
- **BoardWorkbench** owns `players`, `playersLoaded`, `reloadKey`, `tableKey`. Players load in one effect (inline async function, `cancelled` flag, setState only after the `await`); adding a player or recording a match bumps `reloadKey` and `tableKey` together, linking bumps only `reloadKey` (as before). `LeaderboardTable` is rendered with `key={tableKey}`, `shareCode` and `emptyDescription="Add the first player below."` (the prop exists in the table today).
- **RecordMatch** is deliberately not a `<form>` (a stray Enter at the table cannot advance the flow); Preview is `type="button"`. A `fieldset` is disabled while players load, with fewer than two players, and while a confirm is applying (this also makes "Edit scores" disabled while applying and stops edits dropping a preview mid-request). The "add two players" notice shows only after players have loaded. Both selects list every player in the same order, the other side's pick is disabled. Validators and their label strings are unchanged, so messages are byte-identical. A failed Preview focuses the first invalid control in visual order. Tie shows an info `Notice`. Success shows a focused `role="status"` `Notice` ("Match recorded", `Ana beat Ben, 21 to 17. The table is updated.`).
- **MatchPreview** is the only `Surface` in the feature: a labelled region (`role="region"`, `aria-labelledby`, `tabIndex={-1}`) that scrolls into view (`block: "nearest"`) and takes focus when it mounts. Heading `Ana beat Ben, 21 to 17` (winner first, true minus for negatives, "to" instead of a dash), one row per player in entry order with `1,000 → 1,012` (old muted, new semibold) and a large `Delta`, one muted multiplier line, inline error `Notice` on failure, buttons Edit scores (ghost) then Confirm (primary), reversed on phones so Confirm is on top. Old ratings are derived from `newElo - change`, so `PendingPreview` kept its previous shape. The Preview button is not rendered while a preview shows, so there is one primary button on the surface.
- **ScoreInput** pairs the Points `Input size="lg"` with a 48px sign toggle (`aria-pressed`, `aria-label="Negative score for Player N"`, glyph U+2212) because the iOS numeric keypad has no minus key. The input stays the source of truth and `sanitizeIntegerInput` runs on both paths.
- **AddPlayer**, **LinkedAccounts**: as specified. Each unlinked row is its own `<form>` (Enter links), `Link` is disabled while the draft is blank, busy and error state are per row (`Linking…` / `Unlinking…`), the row's error clears when its draft changes. Link and Unlink are 40px (`md`).
- **Formatting**: `formatElo` (`toLocaleString("en-US")`) and `formatScore` (true minus) in `components/manage/format.ts`. Deltas come from `Delta`/`formatSigned`; the old `formatChange` is gone.
- **Lint**: every data fetch is an effect with an inline async function and a `cancelled` flag; mutations refetch either by bumping a `reloadKey` or by awaiting the action in the handler and setting state afterwards. No state-setting function is called synchronously from an effect body, no refs are touched during render, no `eslint-disable`. The effects that touch only the DOM (focus on the success notice, scroll/focus of the preview) are the allowed kind.

Tokens only: no raw palette classes, no `uppercase`, no `font-mono` (the share code's mono lives inside `ShareCode`), no gradients, shadows or `transition-all`, no `dark:` pairs. Verified with the DIRECTION.md migration grep and an extra grep for those terms (both empty), `npx eslint --max-warnings 0` on the owned files (clean), and `npx tsc --noEmit` (no errors in owned files).

## Consequences

- The Edit screen reads as a stack of titled sections with hairlines, one card (the preview) and one primary button per state; colour appears only in deltas, field errors, notices and the "Linked" badge.
- The record flow is thumb-friendly (48px selects, inputs, toggle, Preview, Confirm, Edit scores) and negatives are reachable on iOS.
- Behaviour changes that are intentional and small: adding a player no longer resets the record-match form (it used to, as a side effect of `loadPlayers`); deleting the last board makes the Edit tab show its empty state (and `onBoardsChanged` lets the shell refresh `hasBoards`, once wired); "Tie game" and server errors no longer share one page-bottom string.
- `AppShell` does not yet pass `onCreateBoard` / `onBoardsChanged` (the shell team owns it); everything works without them, only the empty-state action is absent until wired.
- Native `<dialog>` stays mounted when closed, so `ConfirmDialog` instances are always in the DOM.
- Not verified in a browser (no build/dev allowed to the team); visual checks at 320/360/390/768 and light/dark are left to the Polish pass.

## Alternatives considered

- **A shared `BoardsList` for Create and Edit.** Rejected: only Create renders a list of boards.
- **Syncing `selectedId` in an effect** (as before). Rejected in favour of deriving it; removes a lint error and a flash of an unselected state.
- **Calling a shared `load()` from both effect and handlers.** Rejected: the React Compiler lint rule traces through it and flags it. Handlers await the action directly instead.
- **Leaving the inputs enabled while a match is being applied.** Rejected: an edit during the request would drop the preview under the user's thumb. The `fieldset` dims briefly instead.
- **A `<form>` around the record flow** so Enter previews. Rejected by the spec: a stray Enter at the table must never advance it.
- **Hiding the toggle on `sm` and up.** Rejected: consistency, and the cost is one 48px button.

Candidate primitives (built locally, not promoted): `ScoreInput` (numeric field with sign toggle, useful for any signed-integer entry), the rule-separated list row (`border-b py-3 flex flex-wrap items-center gap-x-3 gap-y-2`, used in Your boards and Linked accounts), and a "selector row" (Field + Select + trailing danger button, which needs a `sm:mb-1.5` offset because `Field` always mounts its error slot below the control). `Field` could expose a way to drop that slot's gap when there is no error.
