# Feature spec: Viewing leaderboards (view)

Owner: Feature Lead, view. Binding for the Builder and the Polish designer of this feature. Read `docs/design/DIRECTION.md` and `docs/design/BRIEFS.md` first; this spec only adds what is specific to this feature and where it makes a decision the brief left open.

Files owned: `components/ViewLeaderboards.tsx`, `components/LeaderboardTable.tsx`, and new files under `components/leaderboard/`.

## 1. User goals

| Moment | Who | Goal | What "done" looks like |
|---|---|---|---|
| Glance | Anyone who opens the tab, often on a phone, one thumb | See who is winning | The leader's name and rating are visible without scrolling or tapping, in a table that reads like a printed league table |
| Look up | A friend who was given a code | Open a board they do not own | Type 6 characters, tap Open, see the table. Errors say what to fix |
| Switch | A signed-in player on several boards | Move between "my boards" and "boards I play in" | One tap (chips) or one native picker (select) |
| Share | The owner or any player | Read the code out or send it | The code is on screen in mono and copies with one tap |
| Drill in | A friend who is curious | Tap a name and see that player's stats | The name is a real link to `/p/[id]` |
| Watch | Someone at the table | See the table update after a match is recorded | Row settles from a blue tint; nothing else moves |

Mode is Operate. Scanability and thumb certainty outrank expression. The numbers are the content.

## 2. Information hierarchy

Visual weight, strongest first:

1. **ELO column** (semibold, right-most, the eye's landing spot) and the **board name** (`text-2xl font-semibold tracking-tight`).
2. Player names (ink), the rest of the row (W–L, Win %) in ink at normal weight, rank in `muted-foreground`.
3. Share code (mono, `ShareCode` primitive) under the board name.
4. Board switching and open-by-code: compact, one control height (40px), plain `text-sm` label. They sit **above** the board title in DOM and visual order (the brief puts them above the table), but they are deliberately small so they read as chrome.
5. Live indicator: `text-xs text-muted-foreground`, below the table.

DOM and visual order, top to bottom:

```
[Notice info]          signed out only
[Board picker]         signed in, and (2+ boards, or 1 board while a shared board is open)
[Open by code form]    always
-- 32px --
Board name  [Shared]   h2, text-2xl
Share code  ABC123 [Copy code]
-- 20px --
Table  (# | Player | W–L | Win % | ELO)
● Live
```

If nothing is open (signed out, no code entered yet), the board block is absent and the code form is the only content, followed by nothing. Do not render an empty frame.

## 3. Layout per breakpoint (phone first)

The shell supplies the 768px column and the page padding. Do not add `max-w-*`, `mx-auto` or top padding. Everything aligns to the column's left edge; nothing is centred except `EmptyState`.

Vertical rhythm: root `space-y-8`; controls block `space-y-4`; board block `space-y-5`; title block `space-y-1.5`; live footer `mt-3`.

### 320 to 479px (phones)

- Picker: chips wrap onto multiple lines (`flex flex-wrap gap-2`) when 4 or fewer boards; a `Select` full width when 5 or more.
- Open-by-code: label above, then a single row: `Input` (flex-1, `min-w-0`, max about 11rem so it does not stretch absurdly) and the Open button (`shrink-0`). The row never wraps; 6 mono characters at `tracking-[0.18em]` need about 9rem.
- Table columns: `#`, `Player`, `W–L`, `ELO`. **Win % is hidden below 384px** (`hidden min-[24rem]:table-cell` on head and cells). Names wrap (`break-words`), they are never truncated or clipped.
- Title: name wraps freely (`text-wrap: balance` is global). `Shared` badge follows the name inline.
- Share code row wraps if needed: label, code, Copy button.

### 384 to 639px

Win % appears. Nothing else changes.

### 640px and up (sm, to the 768px column cap)

- Picker and code form can share a line: `sm:flex-row sm:items-end sm:justify-between` for the controls block when the picker is chips; if the picker is a Select, it takes `sm:max-w-xs` and the code form sits beside it. The code form never exceeds its natural width (`sm:w-auto`).
- Table keeps its column structure; extra width goes to the Player column (`w-full`), numerics stay narrow and right-aligned.
- Share code stays under the name (do not float it right; one left edge).

## 4. Table spec (`LeaderboardTable`)

Props stay `{ leaderboardId: string; shareCode?: string }`. One optional prop is added, `emptyDescription?: ReactNode`, with a neutral default; manage may ignore it.

Use `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `components/ui/table`.

| Col | Head | Cell | Notes |
|---|---|---|---|
| 1 | `#` | rank number, `text-muted-foreground`, `w-10` | `numeric` so figures align; rank is `index + 1` (unchanged) |
| 2 | `Player` | `TextLink variant="plain"` to `/p/${id}`, `className="-my-3 block py-3"` | The link fills the cell height so the tap target is the row height (about 44px) while the name stays a real anchor. Rank 1's link adds `font-medium`. `break-words`. `w-full` on this column |
| 3 | `W–L` | `formatRecord(wins, losses)` | `numeric`. Head has an sr-only expansion: visible `W–L`, hidden "Wins and losses" |
| 4 | `Win %` | `formatWinRate(played ? wins / played : null)` | `numeric`, ink, normal weight. Hidden below 24rem |
| 5 | `ELO` | `player.elo` plain integer | `numeric`, `font-semibold text-base text-foreground`. The strongest weight in the row. No "ELO" suffix |

- Add `<caption className="sr-only">Rankings</caption>` as the first child of the table.
- Rank 1 is distinguished by position and the `font-medium` on the name only. No colour, no medal, no tint, no icon.
- No `tabular-nums` class is needed on the table (global), but `numeric` cells set it anyway.
- Row hover: the primitive's `hover:bg-muted/60`. Do not add hover colour of your own.
- Last row has no bottom border (primitive does this).
- Footer under the table, `mt-3`, `flex items-center justify-between gap-3`: left is the Live indicator; right is empty (the share code lives in the view header). When `shareCode` is passed (manage uses it), render `ShareCode` in a row **above** the table (`mb-3`, with a muted "Share code" label like the view header). View does not pass `shareCode` to the table (it shows the code in its own header); do not render it twice.
- Never wrap the table in a Surface, border, or rounded box. The header rule (`border-border-strong`) and row hairlines are the structure.

## 5. States

### 5.1 Loading (table)

A real `Table` with the real header row and **4 body rows** whose cells contain `Skeleton` blocks (rank `h-4 w-4`, name `h-4 w-28`, record `h-4 w-10 ml-auto`, win % `h-4 w-10 ml-auto` with the same hide rule, ELO `h-4 w-10 ml-auto`). Same cell padding as real rows, so column widths and row height match and nothing shifts when data arrives. Wrap in `aria-busy="true"`; add `<p role="status" className="sr-only">Loading rankings</p>`. No spinner, no "Syncing…" text, no pulse other than `Skeleton`'s own.

Loading is derived, not set in an effect: keep `{ leaderboardId, players, records }` in one state object and treat `data.leaderboardId !== leaderboardId` as loading. This also fixes stale rows flashing when the selected board changes (see 9).

### 5.2 Loading (boards list)

While `isAuthenticated` and the board list has not arrived: one `Skeleton` at chip height (`h-10 w-48`) in the picker slot, then the code form (always interactive), and no board block. Do **not** show "No boards yet" until the list has actually arrived empty (the current code flashes it).

### 5.3 Empty board

`EmptyState title="No players yet"` with `description`:
- own board (in "my boards"): "Add players on the Edit tab."
- shared board opened by code: "The owner hasn't added anyone yet."
- default if `emptyDescription` is not passed: "Add the first player to start the rankings."

No action button (the Edit tab is the shell's; do not fake navigation). Keep the Live indicator under the empty state, because adding a player updates it live.

### 5.4 No boards (signed in, none, nothing open)

`EmptyState title="No boards yet"`, `description="Create one, or open a friend's board with its code."`, `action={<Button variant="primary" onClick={onCreateBoard}>Create a board</Button>}`. `ViewLeaderboards` gains an optional prop `onCreateBoard?: () => void`. If the shell does not pass it yet, render the EmptyState without the action and with description "Create one on the Create tab, or open a friend's board with its code." (the prop is a request to the shell team: `onCreateBoard={() => setTab("create")}` in `AppShell`). Place it below the code form.

### 5.5 Signed out

`<Notice tone="info">Sign in to see your boards. You can still open any board with its share code.</Notice>` above the code form. Not amber, no title. The code form is fully usable.

### 5.6 Error

- Boards list failed (`getMyLeaderboards`/`getBoardsIPlayIn` returned `error`, or threw): `<Notice tone="error" title="Couldn't load your boards">Check your connection, then try again.</Notice>` followed by a `Button variant="secondary" size="sm"` "Try again" that reloads. The code form stays usable.
- Table failed (`getPlayers` or `getMatches` returned `error`): `<Notice tone="error" title="Couldn't load the rankings">Check your connection, then try again.</Notice>` + "Try again" button. A failed realtime reload after rows are already on screen keeps the old rows (no error flash), and the Live indicator falls back to its reconnecting state.
- Code lookup invalid (not 6 chars of A-Z/0-9 after normalising): `Field error`: "Enter the 6-character code, letters and numbers." Code not found / lookup failed: "No board has that code. Check it and try again." The error clears as soon as the input changes or a lookup succeeds. Do not show backend strings raw.

### 5.7 Success (board open)

Board block described in section 2. Opening by code shows `Badge tone="neutral"` "Shared" next to the name, **unless** that board is already one of the viewer's own boards, in which case the matching chip/option is selected instead and no badge shows (small refinement; the old code showed "(shared)" for your own board).

### 5.8 Live indicator

`LiveIndicator` (local, `components/leaderboard/LiveIndicator.tsx`): `inline-flex items-center gap-1.5 text-xs text-muted-foreground`.
- Subscribed: `<span aria-hidden class="size-1.5 rounded-full bg-accent">` + "Live".
- Connecting or dropped (anything but `SUBSCRIBED` from the channel's subscribe callback): dot `bg-border-strong`, text "Reconnecting…". Never animate the dot. Never use green. Never uppercase.
This makes "Live" truthful and keeps the old behaviour (the subscription already existed).

## 6. Copy (final strings)

| Where | String |
|---|---|
| Signed-out notice | Sign in to see your boards. You can still open any board with its share code. |
| Picker group label (sr) | Your boards |
| Select option when a shared board is open | Opened by code (disabled, hidden) |
| Code field label | Open a board with a code |
| Code field hint (shown when no error) | Ask the board owner for the 6-character code. |
| Code placeholder | ABC123 |
| Open button | Open; while loading "Opening…" |
| Invalid code | Enter the 6-character code, letters and numbers. |
| Not found | No board has that code. Check it and try again. |
| Shared badge | Shared |
| Share code label | Share code |
| Copy (from primitive) | Copy code / Copied |
| Table caption (sr) | Rankings |
| Column heads | #, Player, W–L (sr: Wins and losses), Win %, ELO |
| Empty board title | No players yet |
| No boards title | No boards yet |
| Create action | Create a board |
| Live | Live / Reconnecting… |
| Errors | Couldn't load your boards / Couldn't load the rankings, "Check your connection, then try again.", button "Try again" |
| SR status on board change | Showing {board name} (visually hidden, `role="status"`) |

Sentence case throughout. Records and win rate use `formatRecord` / `formatWinRate`; empty win rate is the em dash from `formatWinRate`.

## 7. Primitives to use

`Notice`, `Field`, `Input`, `Select`, `Button` (and `buttonVariants`), `Badge`, `Table*`, `Skeleton`, `EmptyState`, `TextLink`, `ShareCode`. Not used: `Tabs` (see 8), `Surface`, `Section` (the board title is larger than a Section title), `Stat`.

Local components (all under `components/leaderboard/`, all candidates for primitives, to be named in the Builder's ADR):
- `BoardPicker`: chips (up to 4) or Select (5 or more).
- `OpenByCode`: the form.
- `LiveIndicator`.
- `RankingsSkeleton`.

## 8. Interactions and motion

- **Board picker.** Chips are `Button`s (`size="md"`): selected = `variant="secondary"` with `aria-pressed="true"`, others `variant="ghost"` with `aria-pressed="false"`. The group is `role="group" aria-label="Your boards"`. Name only, never the share code. A long name wraps inside the chip up to two lines (`whitespace-normal text-left h-auto min-h-10 py-2`), not truncated. Chosen over `Tabs variant="segmented"` because: (a) when a shared board is open no chip is selected and `Tabs` would then have no tabbable element (it roves `tabindex`), (b) `Tabs` segmented does not wrap and overflows a phone, (c) the board is not a tabpanel in the ARIA sense. 5 or more boards: `Select` inside `Field label="Your boards" hideLabel`, `value` = selected id, or `""` when a shared board is open.
- **Switching boards**: instant. No transition. Selecting a chip clears the opened shared board and any code error (as now).
- **Open by code**: a real `<form>`; Enter submits. Open is `type="submit"`, `variant="secondary"`, `loading` while the lookup runs. Input: `font-mono uppercase tracking-[0.18em]`, `maxLength={6}`, `autoCapitalize="characters"`, `autoComplete="off"`, `autoCorrect="off"`, `spellCheck={false}`, `enterKeyHint="go"`. `onChange` keeps `normalizeShareCode(value).slice(0, 6)`. Known quirk, kept: a pasted 7+ char string is cut by `maxLength` before normalising. After success, the input keeps its value.
- **Copy**: `CopyButton` inside `ShareCode` ("Copy code" to "Copied" for about 1.6s, announced politely). No other feedback needed.
- **Realtime**: keep the `players:${leaderboardId}` channel and `postgres_changes` on `players`. After each reload, compare each player's `elo` with the previous load; rows whose rating changed get `animate-settle` (1400ms, `accent-subtle` to transparent). Clear the class on `onAnimationEnd` (never remount rows: a remount would drop keyboard focus from a name link). No settle on the first load, on a board change, or for new rows. No reorder animation: rows jump to their new position. This is the **only** motion in the feature. Under `prefers-reduced-motion` the global rule collapses it; nothing else to do.
- Coalesce bursts: a recorded match fires two player updates. A 150ms trailing debounce on the reload is welcome; it must not change what is shown.
- On first subscription (`SUBSCRIBED`) reload once, to catch updates that landed between the initial fetch and the subscription.
- Nothing animates on load, on board switch, or on tab switch. Hover and press are colour/scale from primitives only.

## 9. Accessibility

- One `h2` (board name). The block is a `<section aria-labelledby>`. The signed-out `Notice` is `role="status"`.
- Picker: chips announce pressed state; Select has a programmatic label; both are keyboard reachable.
- Code form: `Field` wires label, hint and error (`aria-live="polite"` region always mounted). `invalid` border comes from `aria-invalid`.
- Table: real `<table>`, `<th scope="col">` (primitive), sr-only caption, abbreviation expanded for screen readers. The rank number is a plain cell. Links have a visible hover underline and the global 2px focus ring; the block link area gives a 44px tap target.
- Colour never carries meaning here; the table has none. Live state is text plus dot.
- Contrast: all text is `foreground` or `muted-foreground` (6.5:1 or better). Placeholder is `muted-foreground`.
- Touch: chips 40px, input and Open 40px, Copy button 32px (`sm`, primitive default; acceptable as it is a secondary affordance and sits 8px from the code), table row link 44px. Inputs are 16px on phones (primitive).
- Realtime row changes are **not** announced (too chatty at the table); the visible settle is the feedback. Board changes are announced via the sr-only status.
- Do not use `aria-live` on the table.

## 10. State and data rules (behaviour that must survive, plus lint)

Current behaviours that must survive:

1. Signed in: fetch `getMyLeaderboards()` and `getBoardsIPlayIn()` together, merge, de-duplicate by `id` (owned first, then played-in).
2. Default selection is the first board of the merged list when the user has not picked one and no shared board is open.
3. Signed out: no boards list, no picker, the info notice, the code form still works.
4. Open by code: `normalizeShareCode` on input (uppercase, strip non-alphanumerics, 6 max); `isValidShareCode` before calling `getLeaderboardByCode`; invalid blocks the call and shows an error; backend error clears the shared board and shows an error; success sets the shared board and deselects own boards.
5. Selecting an own board clears the shared board and the error.
6. A shared board shows its name, its share code, and the "Shared" marker.
7. The share code of the active board is visible, mono, and copyable.
8. `LeaderboardTable`: props `{ leaderboardId, shareCode? }` unchanged, and manage keeps rendering it (it remounts it via `key={tableKey}` after adding a player or confirming a match, so it must refetch on mount).
9. Data: `getPlayers(leaderboardId)` (sorted by elo desc by the server; keep that order, do not re-sort) and `getMatches(leaderboardId, 1000)` in parallel; `recordsByPlayer(matches)`; `formatWinRate(played ? wins / played : null)`; players with no matches show `0–0` and `—`.
10. Realtime subscription on `players` filtered by `leaderboard_id=eq.${leaderboardId}`, event `*`, reload on any event, channel removed on unmount or board change.
11. Name links to `/p/${player.id}` using the `next/link`-based `TextLink`.
12. Rank is `index + 1` of the server order (ties are not merged).
13. Columns: rank, player, W–L (en dash), Win % (hidden on the narrowest screens), ELO.
14. Sign-out/sign-in: changing `isAuthenticated` re-fetches or clears the list.

Lint-clean requirements (both files currently fail `react-hooks/set-state-in-effect` and `exhaustive-deps`; fix the cause, never disable):
- No `setState` called synchronously in an effect body. `setState` after an `await`, or in a subscription callback, is fine.
- Put the fetch function inside the effect (or in `useCallback` with correct deps) and guard with a `cancelled` flag so a slow response for board A never overwrites board B.
- Derive instead of syncing: `boards = isAuthenticated ? fetched : []`; `activeId = external ? null : (selectedId in boards ? selectedId : boards[0]?.id ?? null)` replaces the "select first board in loadMine" effect and the stale `selectedId` closure.
- Table: keep `{ leaderboardId, players, records, error }` in one state; `loading` is `data?.leaderboardId !== leaderboardId`. A `retry` counter in state can re-run the effect.
- Rating-change detection uses a ref holding the last `Map<id, elo>`, written inside the async load callback only (never during render).

## 11. Removed on purpose

Cyan borders and tints, the tinted "Share code" banner row in the table, `uppercase tracking-*` labels ("Your leaderboards", "View by share code", "Share code", "Live · updates automatically"), mono numerals (mono stays on the share code only), pulsing "Syncing rankings…", amber alert for the normal signed-out state, the share code on every picker chip, the `(shared)` suffix, the centred "No leaderboards yet" paragraph, the rounded bordered wrapper around the table, `input-futuristic`/`btn-primary`, and every raw palette class.

## 12. Cross-team notes

- Shell: optional `onCreateBoard` prop on `ViewLeaderboards` (section 5.4). Everything works without it.
- Manage: `LeaderboardTable` no longer prints a banner; if you pass `shareCode` it renders a quiet row above the table. You may pass `emptyDescription` (for example "Add the first player below.").
- Candidate primitives for the director: a wrapping `BoardPicker` chip group; a `LiveIndicator`; table skeleton rows.

## 13. Acceptance checklist

- [ ] `npx eslint components/ViewLeaderboards.tsx components/LeaderboardTable.tsx components/leaderboard` has no errors or warnings.
- [ ] `npx tsc --noEmit` shows nothing in owned files.
- [ ] The migration grep from DIRECTION.md returns nothing for owned files.
- [ ] No `uppercase` except on the share code input; no `font-mono` except the share code and the code input; no `transition-all`, no gradient, no shadow.
- [ ] All states in section 5 exist. Props contract in section 4 holds.
