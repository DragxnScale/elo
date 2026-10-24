# Feature spec: Creating and managing boards

Owner: Manage Feature Lead. Binding for the manage Builder and Polish designer. Read `docs/design/DIRECTION.md` and the manage brief in `docs/design/BRIEFS.md` first; this document turns them into build instructions and does not repeat them. Where this spec is more specific than the brief, this spec wins; where it deliberately departs from the brief, section 12 says so and why.

Files owned by this team: `components/CreateLeaderboard.tsx`, `components/EditLeaderboards.tsx`, `components/ConfirmDialog.tsx`, and new files under `components/manage/`.

## 1. User goals

1. **Record a result at the table, right now.** One person, phone in one hand, dim room, others watching. Pick two players, type two scores (sometimes negative), see exactly what will happen to both ratings, confirm. Speed and certainty beat everything. This is the most frequent job by far and the one the Edit screen is built around.
2. **Start a board.** Give it a name, optionally change the starting rating, get a share code to send to friends. Used once per group.
3. **Set up the roster.** Add players, optionally tie a player to an account so the board shows up in that person's stats. Used a handful of times per board, mostly on day one.
4. **Tidy up.** Delete a board that was a mistake or is finished. Rare, irreversible, so it must be hard to do by accident and unmistakable about what it destroys.

Mode: Operate. Familiarity (a plain form, a native select, a normal confirm dialog) beats expression. Colour appears only in the rating deltas of the preview, in field errors and in the "Linked" badge.

## 2. Information hierarchy

### Create tab (top to bottom)

1. **New board** form: Name, Starting ELO, one primary button. The only thing a first-time user needs; it carries the visual weight.
2. **Your boards**: a rule-separated list. Name (strongest), share code with copy, starting ELO (muted), a quiet Delete.

### Edit tab (top to bottom, ordered by frequency of use)

1. **Board selector** and its quiet "Delete board" (page head, not a section).
2. **Rankings**: the leaderboard table, for context. Read-only here.
3. **Record a match**: the main job. First actionable block, the only one with a primary button, the only place the large 48px controls appear.
4. **Add player**.
5. **Linked accounts**.

Each block is a `<Section>`; the page stacks them with `space-y-10`. No Surface wraps a section. The only card on the Edit screen is the transient match preview (section 5.5).

## 3. Layout per breakpoint (phone first)

The shell supplies the page column (`Container`, 768px, 16/24px gutters) and top padding. Screens add no width, no top padding. Root of each screen is `<div className="space-y-10">`.

### Create

Phone (360px):

```
New board
Name
[ Friday night pool                  ]
Starting ELO
[ 1000   ]
New players start here. Default 1000.

[ Create board ]                      (md, auto width, left aligned)

Your boards
-------------------------------------------
Friday Night Pool                  [Delete]
ABC123 [Copy code]   Starts at 1,000 ELO
-------------------------------------------
Office Darts                       [Delete]
...
```

- Form: `space-y-4`, `max-w-md`. Name field full width of that cap. Starting ELO input is `w-36` (a number, not a sentence). The button sits `pt-2` below the hint, left-aligned, `md`.
- Form-level feedback (error or success Notice) sits directly above the button, inside the form, `max-w-md`.
- Your boards: `<ul>` with `border-t border-border`, each `<li>` `border-b border-border py-3`. Row is `flex flex-wrap items-start justify-between gap-x-4 gap-y-1`:
  - Left block (`min-w-0 flex-1`): name `text-base font-medium break-words`; under it a `flex flex-wrap items-center gap-x-4 gap-y-1`: `ShareCode`, then `Starts at 1,000 ELO` in `text-sm text-muted-foreground`.
  - Right: `Button variant="danger" size="md"` "Delete" (`-my-1` to keep the row rhythm; the 40px target is kept).
- From `sm`: the same markup; rows have room, so the meta line stays on one line. No other change.

### Edit

Phone (360px), top to bottom, all full width:

```
Board
[ Friday Night Pool (ABC123)      v ]
[Delete board]                         (danger, left)

Rankings
 Share code  ABC123 [Copy code]
 # Player   W-L        ELO
 ...table...

Record a match
Whole numbers; negatives allowed.
Player 1
[ Select a player                 v ]
Points
[ 21                      ] [ - ]
Player 2
[ Select a player                 v ]
Points
[ 17                      ] [ - ]

[            Preview              ]   (lg, full width)

   (preview card appears here)

Add player
Name
[                                  ]
Account username (optional)
[                                  ]
Link to an account so this board shows in their stats.
[ Add player ]

Linked accounts
Link a player to someone's account so this board shows up in their stats.
-------------------------------------------
Ana                       [Linked] [Unlink]
-------------------------------------------
Ben
[ username                ] [ Link ]
-------------------------------------------
```

- Selector row: `flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`. `Field label="Board"` with `Select` at `sm:max-w-sm`. "Delete board" is `Button variant="danger" size="md"`, `self-start` on phones, aligned to the bottom edge of the select from `sm`.
- Record a match, two columns from `sm` (`grid gap-x-6 gap-y-8 sm:grid-cols-2`), one column on phones. Each side is a block with `space-y-4`: player Field, then Points Field. Reading order on a phone is Player 1, Points, Player 2, Points, Preview. Do not put both players first then both scores; a side is a unit.
- The Points control is a row `flex gap-2`: `Input size="lg"` (flex-1) and the sign toggle (section 5.4), both 48px high.
- Preview button: `Button size="lg" className="w-full sm:w-auto sm:min-w-40"`.
- From `sm`: Add player is a two-column grid (`grid gap-4 sm:grid-cols-2`, Name and Account username), button below. Linked accounts rows put controls on the same line as the name.

### Width check

Nothing may scroll horizontally at 320px. Names and board names use `break-words` / `min-w-0`; long player names in `<option>` text are truncated by the native select, which is acceptable.

## 4. States

For each screen: signed out, loading, empty, error, success. Components below are all from `components/ui`.

### 4.1 Create

| State | Rendering |
|---|---|
| Signed out | Only `<Notice tone="info">Sign in to create and manage boards.</Notice>`. No form. (Was amber; signed-out is guidance, not caution.) |
| Idle | Form as section 3. Starting ELO shows `1000`. |
| Submitting | Button `loading`, label "Creating…". Fields stay editable but a second submit is impossible (`loading` disables). |
| Client validation | Per field, via `Field error`, red border. Name empty: "Give the board a name." Starting ELO empty, not a whole number, or outside 100–10,000: "Enter a whole number from 100 to 10,000." Validation runs on submit only (never while typing), clears for a field when that field changes. The first invalid field receives focus. The form has `noValidate`; we own the messages. |
| Server error | `<Notice tone="error" title="Couldn't create the board">{server message}</Notice>` above the button. The message is shown verbatim (for example "Could not generate a unique share code."). Fields keep their values. |
| Success | Form resets (name empty, ELO `1000`). `<Notice tone="success" title="“Friday night pool” is ready">Share code ABC123. Add players on the Edit tab.</Notice>` above the button, `role="status"`. It clears when the user starts typing or submits again. The new board appears at the top of Your boards (list reload). `onCreated()` is still called after the list has reloaded. |
| Your boards: loading | Two `Skeleton` rows `h-14` under the section title (first load only; no skeleton on reloads). |
| Your boards: empty | Section is not rendered. A first-time user sees only the form. |
| Your boards: load error | `<Notice tone="error" title="Couldn't load your boards">` followed by a `secondary` `md` "Try again" button. Retry bumps the reload counter. |
| Delete | Dialog (section 6). Failure: the dialog closes and `<Notice tone="error" title="Couldn't delete the board">{message}</Notice>` appears above the list. |

### 4.2 Edit

| State | Rendering |
|---|---|
| Signed out | `<Notice tone="info">Sign in to edit boards.</Notice>` |
| Boards loading (first load) | `Skeleton` select (`h-10 w-full sm:w-72`) then a `Skeleton` `h-48` block where the table goes. No spinner, no text. |
| Boards load error | `<Notice tone="error" title="Couldn't load your boards">` + "Try again" (secondary, md). |
| No boards | `<EmptyState title="No boards yet" description="Create a board to add players and record matches." action={onCreateBoard && <Button variant="secondary" onClick={onCreateBoard}>Create a board</Button>} />`. The action exists only when the optional prop is passed. |
| Board selected | The full workbench (section 3). Selection defaults to the first board. |
| Players loading (per board) | Rankings shows its own skeleton (view team). The Record form renders with its whole `fieldset` `disabled` and **no** "add two players" notice yet (do not flash a wrong message). Linked accounts renders nothing until players have loaded. |
| Fewer than 2 players (loaded) | Record fieldset `disabled` (everything dims), `<Notice tone="info">Add at least two players to record a match. Use “Add player” below.</Notice>` above the Preview button, Preview disabled. This is the literal "Preview disabled until two players exist" rule, with the reason stated. |
| Delete board | Section 6. On success: selection falls to the first remaining board (derived, not stored), the list reloads, `onBoardsChanged()` is called. On failure: dialog closes, `<Notice tone="error" title="Couldn't delete the board">` appears directly under the selector row. |

Errors are local to the thing that failed (one message slot per section). The old single `error` string at the bottom of the page is removed; a user on a phone never saw it.

### 4.3 Record a match

| State | Rendering |
|---|---|
| Idle | Two sides, empty. |
| Field errors | Shown by `Field error` under the failing field, red border; no boxed banners. Strings are the validators' own: "Please select Player 1.", "Please fill in Player 1 points.", "Player 1 points must be a whole number (negative values allowed).", "Players must be different." etc. Clearing is per field when that field changes (as today). On a failed Preview the first invalid control receives focus. |
| Tie | `<Notice tone="info" title="Tie game — no ELO change.">Change a score to record a winner.</Notice>` directly above the Preview button. No preview. Cleared when any field changes. |
| Preview showing | Section 5.5. The Preview button is hidden while a preview is showing (one primary per surface; Confirm takes over). |
| Applying | Confirm `loading` with "Applying…"; Edit scores disabled. |
| Confirm error | `<Notice tone="error" title="Couldn't record the match">{server message}</Notice>` **inside** the preview card, above the buttons. The preview stays so the user can retry. |
| Success | Preview and inputs reset (players reloaded, as today). `<Notice tone="success" title="Match recorded">Ana beat Ben, 21 to 17. The table is updated.</Notice>` at the top of the section (below the description), `role="status"`, `tabIndex={-1}` and focused so focus is not lost when the Confirm button unmounts. It clears when any field changes. |

Known limit (keep, do not hide): the preview is computed from the ratings on screen; the server recalculates from current ratings when you confirm. If someone else recorded a match in the meantime the applied numbers can differ slightly. The success copy therefore never repeats the numbers.

### 4.4 Add player

| State | Rendering |
|---|---|
| Idle | Name, Account username (optional). |
| Client validation | Name empty: "Enter a name for the player." under Name. |
| Submitting | "Adding…" with `loading`. |
| Server error | `<Notice tone="error" title="Couldn't add the player">{message}</Notice>` under the button. Server messages include "Player already exists." and "That name or account is already on this leaderboard." plus username-lookup failures; show them verbatim. |
| Success | Both fields clear; table refreshes (`tableKey`); players reload; focus returns to Name (adding several players in a row is the normal flow); a quiet `<p role="status" className="text-sm text-muted-foreground">Added Ana.</p>` replaces any earlier message under the button until the next edit. |

### 4.5 Linked accounts

| State | Rendering |
|---|---|
| No players | Section not rendered (as today). |
| Linked row | name, `<Badge tone="win">Linked</Badge>`, `Unlink` ghost. |
| Unlinked row | name, username `Input` (visually labelled by an sr-only Field label "Account username for Ana", placeholder "username") and `Link` secondary. `Link` is disabled while the draft is empty or whitespace. Enter in the input submits (each unlinked row is a `<form>`). |
| Saving | The row's own button `loading`: "Linking…" / "Unlinking…". Other rows stay usable. |
| Error | Under that row's controls via `Field error` (for example "That account is already linked to another player on this board."). Clears when that row's draft changes. |
| Success | Draft deleted, players reload, the row flips between its two shapes. |

## 5. Components and exact composition

### 5.1 File plan (new files under `components/manage/`)

| File | Role |
|---|---|
| `BoardWorkbench.tsx` | Client. Props `{ board: Leaderboard }`. Rendered by Edit as `<BoardWorkbench key={board.id} board={board} />`. Owns `players`, `playersLoaded`, `tableKey`, a `reloadKey` counter. Renders Rankings, Record, Add player, Linked accounts. Because it is keyed by board id, all form state (selections, scores, drafts, preview, errors) resets on a board switch **without effects**. |
| `RecordMatch.tsx` | Client. Props `{ players: Player[]; playersLoaded: boolean; leaderboardId: string; onRecorded: () => void }` (onRecorded reloads players and bumps `tableKey`). Owns the form state, validation, `pending`, `loading`, error and success state. Uses `validatePlayerSelect`, `validateIntegerText`, `parseIntegerText`, `sanitizeIntegerInput` from `lib/match-scores` and `calculateEloChange` from `lib/elo`, unchanged. |
| `MatchPreview.tsx` | Presentational. Props `{ pending: PendingPreview; loading: boolean; error?: string; onConfirm; onEdit }`. Exports the `PendingPreview` type. |
| `ScoreInput.tsx` | Points `Field` + `Input size="lg"` + sign toggle. Props `{ label; playerLabel; value; onChange; error?; inputRef? }`. Candidate primitive (see ADR). |
| `AddPlayer.tsx` | Client form, props `{ leaderboardId: string; onAdded: () => void }`. |
| `LinkedAccounts.tsx` | Client. Props `{ players: Player[]; onChanged: () => void }`. Owns `linkDrafts`, per-row busy and error. |
| `BoardsList.tsx` (optional) | The Your-boards list on Create. Props `{ boards; onDelete(board) }`. |
| `format.ts` (optional) | `formatElo(n)` = `n.toLocaleString("en-US")`; `formatScore(n)` with a true minus. |

`EditLeaderboards` keeps boards, selection, delete, error. `CreateLeaderboard` keeps everything for the Create tab.

### 5.2 Public props (contracts with the shell and view teams)

- `CreateLeaderboard({ isAuthenticated, onCreated })`: unchanged.
- `EditLeaderboards({ isAuthenticated, onCreateBoard?, onBoardsChanged? })`: `isAuthenticated` unchanged; two **optional** additions. `onCreateBoard` powers the empty-state action; `onBoardsChanged` is called after a successful delete so the shell can refresh `hasBoards` (today the Edit tab stays visible after the last board is deleted). Everything works without them; the shell may wire them later.
- `ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel })`: unchanged plus optional `loading?: boolean`.
- `LeaderboardTable` (view team): rendered as `<LeaderboardTable key={tableKey} leaderboardId={board.id} shareCode={board.share_code} />`. View's table shows a quiet share-code row when `shareCode` is passed. Pass `emptyDescription="Add the first player below."` **only if** `components/LeaderboardTable.tsx` already declares that prop when you build; otherwise omit it and leave a one-line note for the lead.

### 5.3 Primitive usage map

| Need | Primitive |
|---|---|
| Section blocks | `Section` (`title`, `description`), default `h2`, never nested here |
| Every field | `Field` with a visible label; hints/errors through `Field` only |
| Text inputs | `Input` (`md`; `lg` for scores) |
| Pickers | `Select` (`md` for board; `lg` for players) |
| Actions | `Button`: Create board (primary, md, `type="submit"`), Preview (primary, lg, full width on phones), Confirm (primary, lg), Edit scores (ghost, lg), Add player (secondary, md, `type="submit"`), Link (secondary, md), Unlink (ghost, md), Delete / Delete board (danger, md), Cancel (secondary), dialog confirm (destructive) |
| Messages | `Notice` (info for guidance and ties, success after create/record, error for failures) |
| Preview card | `Surface` (`padding="md"`), the only one on the screen |
| Result colour | `Delta` for the rating changes |
| Linked state | `Badge tone="win"` |
| Share code | `ShareCode` |
| Loading | `Skeleton`; empty `EmptyState` |
| Formatting | `formatSigned` (inside `Delta`); `cn` |

Do not use `Tabs`, `Table` (the table is the view team's), `Stat` (not needed), or the legacy global classes.

### 5.4 Record a match: details

Fieldset: wrap the form in `<fieldset disabled={!playersLoaded || players.length < 2} className="min-w-0 border-0 p-0">` so all controls dim together. The `Section` description is exactly "Whole numbers; negatives allowed." (it is the hint under the title).

Each side is `<div className="space-y-4">` (not a nested fieldset; the Field labels carry the meaning).

- **Player Field**: label "Player 1" / "Player 2". `Select size="lg"` with first option `<option value="">Select a player</option>` then every player as `Name (1,012 ELO)`. Both selects list **all** players, in the same order; the player chosen on the other side is `disabled`. (Today side 1 disables and side 2 filters, so the second list shifts underfoot. Same rule, stable list.) Changing a select clears that field's error, the pending preview, the tie notice, and the success notice.
- **Points Field**: label "Points" with sr-only suffix: `Points<span className="sr-only"> for Player 1</span>`. Layout row: `Input size="lg" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next"` (the second side uses `enterKeyHint="done"`), no placeholder, and the **sign toggle**: `Button variant="secondary" size="icon" className="size-12 text-lg aria-pressed:border-foreground aria-pressed:bg-muted" aria-pressed={value.startsWith("-")} aria-label="Negative score for Player 1"` with the visible glyph "−" (U+2212). Pressing toggles a leading `-` on the string value and keeps focus on the toggle; the Input stays the single source of truth (`sanitizeIntegerInput` still runs on every change). This exists because iOS numeric keypads have no minus key; without it, "negatives allowed" is unreachable on the phone the screen is designed for. On sm+ it stays (consistency, still cheap).
- `onChange` for every Points input: `onChange(sanitizeIntegerInput(e.target.value))` exactly as today.
- Validator labels are unchanged strings: `"Player 1"`, `"Player 2"`, `"Player 1 points"`, `"Player 2 points"`, so messages are byte-identical to today.
- **Preview button**: `type="button"` (primary, lg). Hidden while `pending` is set. Disabled when fewer than two players (inherited via fieldset).
- On Preview with errors: set errors; focus the first invalid control in visual order (Player 1, Points 1, Player 2, Points 2) using `ref`s (React 19: pass `ref` as a prop to `Input`/`Select`, which spread props).

### 5.5 Preview and confirm (the one card)

`Surface padding="md"` rendered as `role="region" aria-labelledby={headingId} tabIndex={-1}`, directly below the Preview button position, `space-y-4`, no entry animation. On appearing: `scrollIntoView({ block: "nearest" })` (no smooth scrolling) and `focus({ preventScroll: true })` on the region so keyboard and screen-reader users land on it.

```
Ana beat Ben, 21 to 17                      <- h3, text-base font-semibold
-------------------------------------------   border-t border-border
Ana                              +12
1,000 → 1,012                             
-------------------------------------------
Ben                              −8
1,000 → 992
-------------------------------------------
Ratings are ELO. Score margin ×1.41 · Upset ×1.00.   <- text-sm muted
[Notice error, only on failure]
[        Confirm        ]  [ Edit scores ]
```

- Sentence: winner first, always, because ties never reach here. "Ana beat Ben, 21 to 17." Scores are the winner's then the loser's; negatives use a true minus ("10 to −3"). Words ("to"), not dashes, so a negative never reads as a range. This replaces "Ana with 21 points vs Ben with 17 points". `formatPointsLabel` is no longer imported (it stays in `lib`).
- Rows: one per player in the order they were entered on the form (so the user can match them to the fields they just typed). Each row `flex items-center justify-between gap-4 border-t border-border py-3`: left, name `text-base font-medium break-words` and under it `text-sm tabular-nums` with the old rating `text-muted-foreground`, an arrow `→` in prose, and the new rating `font-semibold text-foreground`; right, `<Delta value={change} className="text-3xl font-semibold" />`. `Delta` supplies the sign, colour and accessible name. The old number and the arrow are plain text; **colour lives only in the deltas**.
- Muted line: "Ratings are ELO. Score margin ×1.41 · Upset ×1.00." (`toFixed(2)` as today). The line "Winner gains +X, loser loses −Y (75% of winner gain)" is removed because the two deltas already say it and the 75% was a hard-coded duplicate of a `lib/elo` default.
- Buttons: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`; DOM order: Edit scores (ghost, lg), Confirm (primary, lg). On a phone Confirm is on top and full width, Edit scores below, matching the Dialog footer convention. Confirm label "Confirm", "Applying…" while loading.
- "Edit scores": clears `pending` and focuses Player 1's Points input.
- Editing any field while the preview is showing drops the preview (current behaviour: preview can never describe stale inputs).

### 5.6 Add player: details

`<form onSubmit noValidate>` with `grid gap-4 sm:grid-cols-2`. Name: `Field label="Name"`, `Input autoComplete="off" enterKeyHint="next"`. Account: `Field label="Account username" optional hint="Link to an account so this board shows in their stats."`, `Input autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done"`. The button spans the grid (`sm:col-span-2`), secondary, md, `type="submit"`, left aligned.

### 5.7 Linked accounts: details

`Section title="Linked accounts" description="Link a player to someone’s account so this board shows up in their stats."` (the one explanation). The list is `border-t border-border`, items `border-b border-border py-3`, each `flex flex-wrap items-center gap-x-3 gap-y-2`. Name: `min-w-0 flex-1 basis-40 text-base break-words` (basis forces the controls onto a second line on phones when they do not fit). Linked controls: `Badge` then `Unlink` (aria-label "Unlink Ana"). Unlinked controls: `<form className="flex w-full items-start gap-2 sm:w-auto">` containing a `Field hideLabel` Input (`flex-1 sm:w-44`) and `Link` (aria-label "Link Ana", shows "Link").

### 5.8 Create: details

- `Section title="New board"` holds the form. `Field label="Name"` with `Input placeholder="Friday night pool" autoComplete="off" enterKeyHint="next"`. `Field label="Starting ELO" hint="New players start here. Default 1000."` with `Input type="text" inputMode="numeric" className="w-36"`; state is a **string** (`"1000"`), digits only (`replace(/\D/g, "")`), parsed with `Number` on submit. (Today a `number` state makes the field impossible to clear: emptying it snaps to `0`.)
- Validation (client) mirrors the server, which remains authoritative and is still called with the trimmed-by-server name and the parsed number: name non-empty after trim; 100 <= ELO <= 10000.
- Your boards rows per section 3. Row Delete has `aria-label={`Delete ${name}`}`. Starting ELO copy: "Starts at 1,000 ELO".

## 6. Delete board and `ConfirmDialog`

`ConfirmDialog` is rebuilt on `components/ui/dialog.tsx`. Same props (plus optional `loading`), same call sites in Create and Edit.

- Always render `<Dialog open={open} ...>`; do **not** `return null` when closed (the native dialog needs to stay mounted to play its exit animation and restore focus).
- `title` -> Dialog `title`; `message` -> Dialog `description`. No children.
- Footer, in DOM order: `Button variant="secondary"` "Cancel" (`onClick={onCancel}`, disabled while loading), then `Button variant="destructive" loading={loading}` with `confirmLabel` (`onClick={onConfirm}`). Cancel is first in the DOM so the native dialog's initial focus lands on the **safe** choice. Do not set `autoFocus` on the destructive button.
- `onClose` (Esc, backdrop) = `onCancel`, except it is ignored while `loading`.
- Default `confirmLabel` stays "Delete" (props contract); both callers pass `confirmLabel="Delete board"`. While loading, callers pass `loading` and the label stays the same.
- Call-site copy: title **"Delete leaderboard?"**; message: `“Friday Night Pool” will be deleted for good, along with all its players and matches. This can’t be undone.` The board name is in the message in curly quotes.
- **Stale-message bug**: today the message is built from `deleteTarget?.name`, which becomes "undefined" the instant the target is cleared, while the exit animation is still playing. Keep a separate boolean `open` and a snapshot `{ id, name }` of the target; clear the snapshot only when the next target is set, never on close. Create stores the `Leaderboard` row; Edit stores `{ id, name }` captured when "Delete board" is pressed (the selected board may disappear after deletion).
- Delete flow: confirm -> `loading` true -> `await deleteLeaderboard(id)` -> close; error -> Notice per section 4; success -> reload + callback.
- Colour: the only solid red in the product is this confirm button.

## 7. Copy (final strings)

Create: "New board" / Name / "Friday night pool" / Starting ELO / "New players start here. Default 1000." / "Create board" / "Creating…" / "Your boards" / "Starts at 1,000 ELO" / "Delete" / "Copy code" (from `ShareCode`) / "Give the board a name." / "Enter a whole number from 100 to 10,000." / "Sign in to create and manage boards." / "“Name” is ready" + "Share code ABC123. Add players on the Edit tab." / "Couldn't create the board" / "Couldn't load your boards" / "Try again" / "Couldn't delete the board".

Edit: "Board" / "Delete board" / "Rankings" / "Record a match" / "Whole numbers; negatives allowed." / "Player 1", "Player 2" / "Select a player" / "Points" / "Negative score for Player 1" / "Preview" / "Confirm" / "Applying…" / "Edit scores" / "Tie game — no ELO change." + "Change a score to record a winner." / "Add at least two players to record a match. Use “Add player” below." / "Match recorded" + "Ana beat Ben, 21 to 17. The table is updated." / "Couldn't record the match" / "Add player" / "Adding…" / "Name" / "Account username" / "(optional)" / "Link to an account so this board shows in their stats." / "Enter a name for the player." / "Added Ana." / "Couldn't add the player" / "Linked accounts" / "Link a player to someone’s account so this board shows up in their stats." / "Linked" / "Unlink" / "Link" / "Linking…" / "Unlinking…" / "username" / "Sign in to edit boards." / "No boards yet" / "Create a board to add players and record matches." / "Create a board".

Dialog: "Delete leaderboard?" / "Cancel" / "Delete board".

Rules: sentence case, no exclamation marks, no emoji, plain verbs. Server messages are shown verbatim. Numbers use thousands separators (`toLocaleString("en-US")`) and the `→` only in prose.

## 8. Interactions and motion

- No new animation. Press scale and the 150ms colour transitions come from `Button`/`Input`. The Dialog's enter/exit comes from globals. The preview card, the notices and the list rows appear instantly: they are the direct result of a tap and animating them would only delay the next one.
- The one authored moment in the product (a row settling from a blue tint) happens in the view team's table after Confirm; do not add a competing flourish here.
- Keyboard: Enter submits Create, Add player and each Link row; Enter inside a Points input does nothing: the Record form is deliberately not a `<form>` element and Preview is `type="button"`, so a stray Enter at the table can never advance the flow. Nothing animates on keyboard actions.
- Focus management: first invalid field after a failed submit; preview region on Preview; Player 1 Points on Edit scores; success notice after Confirm; Name after Add player; dialog returns focus to its trigger (native).
- Scroll: `scrollIntoView({ block: "nearest" })` on the preview only.
- `prefers-reduced-motion` needs nothing from this feature; there is no motion of our own.

## 9. Accessibility notes

- Every control has a visible label bound with `Field` (Linked-account username inputs have an sr-only label with the player's name). No placeholder-as-label.
- Errors are announced: `Field` wraps errors in a polite live region that is always mounted; `Notice tone="error"` is `role="alert"`; success notices are `role="status"`. Do not mount a Notice with an error already inside it for a stale message.
- The Points sign toggle is a real toggle button (`aria-pressed`) with a name that includes the player; the Input stays the editable source of truth.
- The preview is a labelled region with focus moved to it; the deltas read "up 12" / "down 8" via `Delta`'s `aria-label`; colour is never the only signal (sign + word).
- Touch targets: 48px for the record flow (selects, score inputs, sign toggle, Preview, Confirm, Edit scores); 40px (`md`) for everything else, including Link, Unlink, Delete and Delete board. `ShareCode`'s copy button is 32px (`sm`, owned by the primitive); flagged to the director in the ADR.
- Contrast: all colours come from tokens; `text-loss` on `background` for field errors and `Delta` meet the documented ratios. Do not put muted text on `muted` fills.
- Dialog: native `<dialog>`, focus trapped, Esc closes (except while deleting), initial focus on Cancel.
- Disabled `fieldset` removes the record controls from the tab order when there are fewer than two players; the reason is in a Notice just above it.
- Heading structure: page has Section `h2`s ("Rankings", "Record a match", "Add player", "Linked accounts"); the preview heading is an `h3`; Create has "New board" and "Your boards" `h2`s.

## 10. State and data rules (behaviour that must survive, plus lint)

Current behaviours that **must** survive. Each is a regression if it breaks:

1. Sign-in-required states for Create and Edit.
2. Create: name + starting ELO; server-enforced 100–10000 bounds still applied and client-mirrored; form resets and the list reloads after create; `onCreated()` fires after create and after delete.
3. Your boards list: name, share code, starting ELO, per-row delete with confirm.
4. Delete board with confirm in **both** Create and Edit; the dialog names the board; `ConfirmDialog` props contract.
5. Edit: board selector listing the user's boards, first board selected by default, switching boards resets the workbench.
6. Add player with optional account username; name trimmed server-side; success clears both fields, reloads players and refreshes the table (`tableKey`).
7. Link / unlink an account per player; draft state per player; `Link` disabled for empty drafts; a linked player shows "Linked" + Unlink; unlinking passes `null`.
8. Record match: two player selects, two integer inputs, negatives allowed and sanitised while typing (`sanitizeIntegerInput`), every validator message from `lib/match-scores` (select, required, whole-number), "Players must be different.", the same player cannot be chosen on both sides (disabled option), Preview disabled until two players exist.
9. Preview computed with `calculateEloChange` from the on-screen ratings; before -> after and signed change per player; score-margin and upset multipliers shown; preview is dropped on any edit.
10. Tie game blocks the preview with the same message and no ELO change.
11. Confirm calls `applyMatchToLeaderboard(boardId, p1, p2, s1, s2)`, shows a loading label, surfaces the server error, then reloads players, resets the form and refreshes the table.
12. Realtime/live table: the table is rendered with `key={tableKey}` and `shareCode`; the key still bumps after add player and after confirm.
13. Share code visible and copyable (Create list and the table's row).

Lint (files must be clean, including today's three pre-existing `react-hooks/set-state-in-effect` errors and two `exhaustive-deps` warnings):

- No synchronous setState in an effect, and no calling a state-setting function from an effect body (the rule traces into functions declared in the component). Pattern: fetch **inside** the effect with an inline `async` function and a `cancelled` flag, and call `setState` only after an `await`. Re-fetch after a mutation by bumping a `reloadKey` counter that is an effect dependency; do not call a shared `load()` from both the effect and handlers.
- Derive instead of syncing: `const activeId = boards.some(b => b.id === selectedId) ? selectedId : boards[0]?.id`. Reset form state by remounting with `key`, not by an effect.
- Do not read or write refs during render. Focus and `scrollIntoView` calls happen in event handlers or in `useEffect` that touch only the DOM (not state).
- No `eslint-disable`, no `@ts-ignore`.

Data notes: `getMyLeaderboards` returns `{ leaderboards, error? }`; `getPlayers` returns `{ players, error? }`; `createLeaderboard` returns `{ leaderboard }` or `{ error }` (use the returned row's `name` and `share_code` for the success Notice); `addPlayer`, `applyMatchToLeaderboard`, `linkPlayerToAccount`, `deleteLeaderboard` return `{ error? }`. Do not change `app/actions.ts`.

## 11. Removed on purpose

Cyan/violet bordered cards on each section; the boxed red `FieldError` panels (replaced by `Field error`); the emerald preview panel, glowing mono figures and `text-2xl font-bold` deltas; the cyan `ELO` figures; uppercase tracking section labels ("YOUR BOARDS", "LINKED ACCOUNTS", "RECORD MATCH"); the `select-match` hack and `py-3 text-base` input hack (`size="lg"` replaces both); the `fixed inset-0` modal with `backdrop-blur-sm` and glow shadow; the amber signed-out box; centred slate "Create a leaderboard first…" text; `input-futuristic` / `btn-primary` / `btn-secondary`; the single page-bottom error string; the "Winner gains +X, loser loses −Y (75%…)" line; the `formatChange` helper (use `Delta`); the asymmetric player lists; `Number` state for the starting ELO; the "Syncing" style states (none existed here, none are to be added).

## 12. Departures from the brief (and why)

1. **Link / Unlink are `md` (40px), not `sm` (32px).** Direction principle 6 sets 40px as the minimum control size; a 32px button next to a 48px phone workflow is the wrong end of the tap-target range.
2. **A sign toggle beside each Points input.** The brief specifies `inputMode="numeric"`, which on iOS has no minus key, so "negatives allowed" would be unreachable on a phone. The input keeps `inputMode="numeric"`.
3. **Preview button hidden while a preview shows.** Keeps one primary button on the surface (Direction 11) instead of a primary Preview above a primary Confirm.
4. **Result sentence "Ana beat Ben, 21 to 17"** instead of "Ana 21 – Ben 17": says who won, and avoids a negative score reading as a range ("−3–10").
5. **Winner/loser/75% line dropped.** The two deltas already state it; the 75% was a hard-coded duplicate of a `lib/elo` default.
6. **Rankings gets a visible `h2`.** The brief lists the table without a title; the Edit screen is otherwise a stack of titled sections and a heading gives assistive tech a landmark.
7. **Create form has no Surface.** The Direction allows one for "a form being filled in", but the form is the only thing on the screen; whitespace is enough, and it keeps "one justified card" true for the whole feature.

## 13. Acceptance checklist

- [ ] `npx eslint components/CreateLeaderboard.tsx components/EditLeaderboards.tsx components/ConfirmDialog.tsx components/manage` has no errors or warnings.
- [ ] `npx tsc --noEmit` shows nothing in owned files.
- [ ] The migration grep from `DIRECTION.md` returns nothing for owned files. No `uppercase`, no `font-mono` (the only mono is inside `ShareCode`), no `transition-all`, no gradient, no shadow, no `dark:` colour pairs, no `eslint-disable`.
- [ ] `CreateLeaderboard`, `EditLeaderboards`, `ConfirmDialog` keep their exported names and required props; added props are optional.
- [ ] Every state in section 4 exists. Every behaviour in section 10 is present.
- [ ] At 320, 360, 390 and 768px: no horizontal scroll; every control in the record flow is 48px high; Preview is full width on phones.
- [ ] Light and dark both read correctly; only tokens are used.
- [ ] Exactly one primary button is visible on each screen state (Create: Create board; Edit idle: Preview; Edit with preview: Confirm).
