# 210. Viewing leaderboards: design spec

Status: Accepted

## Context

The "view" tab is the payoff screen of Kleos: someone opens it to see who is winning, or to open a friend's board by its share code. It is used one-handed on a phone, usually in short glances. The existing implementation (`components/ViewLeaderboards.tsx`, `components/LeaderboardTable.tsx`) uses the replaced neon look: cyan bordered boxes, a tinted share-code banner inside the table, uppercase tracking labels, mono numerals, a pulsing "Syncing rankings…" text, an amber alert for the normal signed-out state, and a share code printed on every board chip.

The code also has behaviour problems that a redesign should not carry over:

- Both files fail `react-hooks/set-state-in-effect` and `exhaustive-deps`.
- "No leaderboards yet" flashes for signed-in users before the board list arrives.
- Switching boards shows the previous board's rows until the new fetch resolves, and a slow response for an old board can overwrite a newer one (no cancellation).
- Failed fetches are silently ignored.
- The code field is not a form, so Enter does nothing.
- "Live" is a static claim; nothing reflects the subscription state.

Constraints: `LeaderboardTable` is also rendered by the manage team's Edit screen with props `{ leaderboardId, shareCode? }` and is remounted there via `key`. Only the files listed in the brief may be edited, and `app/actions.ts`, `lib/**` and the Kokonut components are read-only. `docs/design/DIRECTION.md` and `BRIEFS.md` are binding. This ADR records the spec written in `docs/design/features/view.md`; it contains no UI code.

## Decision

Specify the screen as a printed league table with quiet controls above it, built only from the shared primitives plus four small local components in `components/leaderboard/`.

**Hierarchy and layout.** Order: signed-out `Notice` (info), board picker, one-line open-by-code form, then the board: name as `h2` (`text-2xl semibold`) with a `Shared` badge when it was opened by code, the `ShareCode` under it, the table, and a Live indicator under the table. Weight is carried by the ELO column and the board name; the controls are 40px chrome. One left edge, no cards: the table's header rule and row hairlines are the only structure.

**Table.** `#` (muted), Player (`TextLink plain`, with a block link area `-my-3 py-3` so the tap target is the 44px row while the name stays a real anchor), `W–L` via `formatRecord`, `Win %` via `formatWinRate` hidden below 384px, `ELO` right-most, `text-base font-semibold`. Rank 1 is distinguished by position and a `font-medium` name only. The tinted share-code banner is removed; the code lives in the view header. If `shareCode` is passed (manage), the table renders a quiet `ShareCode` row above itself instead, so the prop contract holds. One optional prop, `emptyDescription`, is added so each host can give a correct empty hint; the default is neutral.

**Board picker.** Up to 4 boards: a wrapping group of `Button`s (selected `secondary`, others `ghost`, `aria-pressed`), names only. 5 or more: a `Select`. Shown only when there are 2+ boards, or 1 board while a shared board is open (so the user can return). The brief offered `Tabs variant="segmented"`; I rejected it, see below.

**Open by code.** A real `<form>` with `Field`, a mono uppercase letter-spaced `Input` (`maxLength` 6, placeholder ABC123, `normalizeShareCode` on change, mobile text-entry attributes) and a secondary `Open` button with a loading state. Errors go through `Field error` with plain-language copy that names the fix, and clear when the input changes. Opening a code that is already one of the user's own boards selects that board instead of labelling it "Shared".

**States.** Loading is a real table header plus 4 `Skeleton` rows in the same cell structure (no layout shift), derived from "data belongs to a different board" rather than set in an effect. Boards-list loading is a chip-height skeleton. Empty board is `EmptyState "No players yet"` with a hint that depends on ownership. No boards is `EmptyState "No boards yet"` with a "Create a board" action wired to an optional `onCreateBoard` prop that the shell can pass. Signed out is `Notice tone="info"`. Errors from `getMyLeaderboards`, `getBoardsIPlayIn`, `getPlayers`, `getMatches` and the code lookup become `Notice tone="error"` or field errors with a "Try again" action, and a failed background reload keeps the old rows.

**Live and motion.** The subscription on `players` stays. A small `accent` dot and "Live" in `text-xs text-muted-foreground` replaces the green strip; it reads "Reconnecting…" with a neutral dot when the channel is not `SUBSCRIBED`, so the label is true. After each reload, rows whose `elo` changed get `animate-settle`, cleared on `onAnimationEnd` (not by remounting, to keep keyboard focus). That is the only motion. Nothing animates on load, board switch or tab switch. The channel also reloads once when it first becomes `SUBSCRIBED`, and a 150ms trailing debounce coalesces the two player updates a match produces.

**Code quality.** The spec requires lint-clean files: no synchronous `setState` in effects; fetches inside the effect with a `cancelled` flag; derived state for the default board selection (`activeId`) and for table loading; a ref for the previous ratings written only in async callbacks.

## Consequences

- The screen reads as a league table; the single strongest element is the ELO column, and the share code is readable and copyable (via the `ShareCode` primitive) instead of being a decorative banner.
- All current behaviour survives (itemised in section 10 of the spec); the additions (error states, Enter to submit, honest Live label, no stale rows, no flash of the empty state) fix defects rather than add features.
- Four local components (`BoardPicker`, `OpenByCode`, `LiveIndicator`, `RankingsSkeleton`) add files but keep each file small. They are candidate primitives for the director: a wrapping chip group and a table skeleton are likely to be useful elsewhere.
- Two small cross-team touch points, both optional and non-breaking: `onCreateBoard` for the shell, `emptyDescription` for manage. If neither team adopts them, the screen still works with neutral copy and no empty-state action.
- The board switch shows a skeleton each time (no cache). This is a trade-off for correctness; it can be revisited if switching feels slow.
- Realtime row changes are not announced to assistive tech, to avoid chatter at the table; the visual settle is the feedback.
- A pasted code longer than 6 characters is truncated by `maxLength` before normalising (existing behaviour, kept to follow the brief).
- Polish cannot verify visually: the rules forbid `next dev` and `next build` in parallel, so the Polish pass is a code-level review against this spec.

## Alternatives considered

- **`Tabs variant="segmented"` for the board picker.** It is what the brief suggested, but it does not wrap and overflows a phone with long names, and when a shared board is open no tab is selected so the roving `tabindex` leaves nothing tabbable. A button group with `aria-pressed` gives the same look from existing primitives and has neither problem.
- **Always a `Select` for the picker.** Fewest pixels, but hides the boards behind a tap. For the common 2 to 4 boards, visible chips are one tap and show the choice at a glance.
- **Title first, controls between the title and the table.** Keeps the headline at the top but separates the title from its own table. Controls above the title match the brief ("above the table") and read as page chrome.
- **Share code inside the table (kept from the old design, restyled).** Rejected: the brief removes the banner, and the code belongs to the board, not to the rows. It stays in the table only when a host passes `shareCode` explicitly.
- **Medals, a coloured row or a tint for rank 1.** Rejected by the direction (colour carries meaning; the leader is already first).
- **Win/loss colouring in the table.** Not needed: the table has no per-result data; colour is reserved for the settle flash.
- **Remounting rows (`key` change) to restart the settle animation.** Simple, but drops keyboard focus on a name link when a realtime update arrives; `onAnimationEnd` clearing avoids that.
- **A toast or sr announcement per realtime update.** Too noisy for the table moment.
- **Fixing the paste truncation by removing `maxLength`.** Contradicts the brief; it is a minor quirk, left as is.
