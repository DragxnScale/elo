# 211. Viewing leaderboards: implementation

Status: Accepted

## Context

ADR 210 and `docs/design/features/view.md` specify the "view" tab as a printed league table with quiet controls above it. This ADR records how it was built. The old `ViewLeaderboards.tsx` and `LeaderboardTable.tsx` used the neon look, failed `react-hooks/set-state-in-effect` and `exhaustive-deps`, flashed "No leaderboards yet" before the list arrived, showed stale rows when the board changed, ignored fetch errors, and had a code field that was not a form. `LeaderboardTable` is also rendered by the manage screen (`<LeaderboardTable key={tableKey} leaderboardId shareCode />`), so its props contract had to keep working.

## Decision

Files: `components/ViewLeaderboards.tsx`, `components/LeaderboardTable.tsx`, and new `components/leaderboard/{BoardPicker,OpenByCode,LiveIndicator,RankingsHead,RankingsSkeleton}.tsx`. Only shared primitives and tokens are used (`Notice`, `Field`, `Input`, `Button`, `Badge`, `Skeleton`, `EmptyState`, `TextLink`, `ShareCode`, `Table*`, plus `formatRecord` from `lib/utils`). No raw palette classes, no gradients, no shadows, no `transition-all`; `uppercase` and `font-mono` appear only on the code input (the `ShareCode` primitive owns its own mono).

**State model, `ViewLeaderboards`.** `fetched: {ok, boards} | null` (null means loading), `attempt` (retry counter), `selectedId`, `external` (board opened by code), `codeInput`, `codeError`, `lookingUp`. Everything else is derived: `boards = isAuthenticated && fetched.ok ? fetched.boards : []`; `ownBoard` is the board matching `selectedId`, else `boards[0]`; `active = external ?? ownBoard`; `boardsLoading`, `boardsFailed`, `hasNoBoards`, `showPicker` are plain expressions. The effect fetches `getMyLeaderboards` and `getBoardsIPlayIn` together with a `cancelled` flag, merges and de-duplicates by id (owned first), and calls `setFetched` only after the awaits. Sign-in and sign-out reset the fetched list and pick through the React "adjust state during render" pattern (`seenAuth`), not an effect. A `lookupTicket` ref (touched only in event handlers) drops the answer of a code lookup that was overtaken by picking a board.

**State model, `LeaderboardTable`.** One state object `data: {leaderboardId, players, records, loaded, failed, settling} | null`. Loading is `!data || data.leaderboardId !== leaderboardId`. The effect owns `cancelled`, a monotonically increasing request number (out-of-order responses are discarded), a 150ms trailing debounce, and `previousElo`, a local `Map` written only inside the async `load`. Because it is local to one effect run, a board change or a remount (manage's `key`) starts with no previous ratings, so the first load never settles. After each successful reload, players whose `elo` differs from `previousElo` are added to `data.settling`; their `TableRow` gets `animate-settle` and `onAnimationEnd` removes the id. Rows are never remounted, so a focused name link keeps focus. The channel `players:${id}` and its `postgres_changes` filter are unchanged; `removeChannel` runs in cleanup; `SUBSCRIBED` triggers one reload. A failed reload with rows on screen keeps them and flips the indicator to "Reconnecting…"; a failed first load shows `Notice` plus "Try again" (which clears `data` and bumps `attempt`). "Live" is true only when the channel for this board is `SUBSCRIBED` and the last load did not fail (`subscribedTo` stores the board id so it cannot leak across boards).

**Component APIs.**
- `LeaderboardTable({ leaderboardId, shareCode?, emptyDescription? })`. With `shareCode` it renders a "Share code" + `ShareCode` row above the table in every state. View does not pass it (its header already shows the code).
- `ViewLeaderboards({ isAuthenticated, onCreateBoard? })`. Without `onCreateBoard` the empty state has no button and says "Create one on the Create tab, ...".
- `BoardPicker({ boards, selectedId, onSelect })`: up to 4 boards render as `Button` chips (`aria-pressed`, selected `secondary` with a `border-foreground/50`, others `ghost`); 5 or more render a `Select` in a `Field` with a hidden label and a hidden disabled "Opened by code" option while a shared board is open.
- `OpenByCode({ value, error, loading, onChange, onSubmit })`: presentational form. State lives in the parent so choosing a board can clear the error. `onChange` receives the already normalised value.
- `LiveIndicator({ live })`, `RankingsHead()` (header row shared by table and skeleton, exports `WIN_RATE_COLUMN`), `RankingsSkeleton()` (real header, 4 rows, each cell a 24px line holding a `Skeleton`, so row height matches real rows).

**Copy and behaviour** follow section 6 and 10 of the spec: the code lookup never shows the backend string, a code that matches one of the viewer's boards selects it instead of showing "Shared", `role="status"` announces "Showing {name}", and the section is labelled by its `h2`.

**Deviations from the spec.**
- The player link uses `wrap-anywhere` (`overflow-wrap: anywhere`) instead of `break-words`. In an auto-layout table `break-word` does not lower the cell's min-content width, so a long unbroken name would force horizontal scrolling; `anywhere` does.
- Controls stay stacked at every width. The spec says the picker and code form "can" share a line from 640px; I kept one column because the code form's hint makes it about 330px wide and top/bottom alignment of a chip row against a label-plus-input-plus-hint block looks accidental. Easy to add later.
- Added `RankingsHead.tsx` (not named in the spec) so the table and skeleton cannot drift apart.
- The selected chip gets `border-foreground/50` so the selection is visible without relying only on the card/background difference in light mode.

## Consequences

- Both files and all new files are lint-clean with no disables; `tsc` reports nothing in owned files, and the manage call site type-checks. The DIRECTION.md migration grep returns nothing for owned files.
- Switching boards always shows the skeleton first (no cache). This is the correct trade for never showing another board's rows.
- A settle animation already running when a second rating change arrives for the same row is not restarted (the class is already present). Acceptable: the tint is already showing.
- Pasted codes longer than 6 characters are still cut by `maxLength` before normalising (existing behaviour, per the brief).
- Not verified visually: the rules forbid running the dev server or a build in parallel.
- Candidate primitives for the director: `BoardPicker` (wrapping chip group), `LiveIndicator`, `RankingsSkeleton`/table skeleton rows.
- Requests to other teams (both optional): shell passes `onCreateBoard={() => setTab("create")}`; manage may pass `emptyDescription`.

## Alternatives considered

- **A `useRef` for previous ratings.** The brief suggested a ref; a variable local to the effect run is simpler, cannot be read during render, and resets itself on board change and remount.
- **Resetting auth-dependent state in an effect.** Flagged by `set-state-in-effect`; the render-time reset is the documented pattern.
- **`Tabs variant="segmented"` for boards.** Rejected in ADR 210 (no wrap, no tabbable element when a shared board is open).
- **Keeping `OpenByCode` stateful with an imperative reset.** More moving parts than lifting four values into the parent.
- **Remounting rows with a changing key to restart the settle.** Drops keyboard focus on name links.

## Review follow-up

The Design Director's review found one defect: on phones with a long player name, the record cell wrapped at the en dash, so "12–4" rendered as "12–" over "4" and broke the tabular column.

Change, in `components/LeaderboardTable.tsx` only:

- Added `whitespace-nowrap` to the W–L (record) `TableCell`, so a record can never break across lines.
- Added `whitespace-nowrap` to the ELO `TableCell` as a safeguard, since it is the heaviest figure and must never wrap.

Why here and not in `components/ui/table.tsx`: that file is not ours to edit. The director may still add `whitespace-nowrap` to the `numeric` variant, which would also cover the stats tables; the local classes are harmless alongside it. The name column already uses `wrap-anywhere`, so the long name wraps and the numeric columns keep their width.

Note: the review referred to this file as `0220-view-build.md`; the existing build ADR is `0211-view-build.md`, so the follow-up is appended here.
