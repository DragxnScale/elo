# 230. Viewing leaderboards: polish pass

Status: Accepted

## Context

ADR 211 records the build of the view feature against `docs/design/features/view.md`. This pass reviews that build for fidelity to DIRECTION.md and the spec, hierarchy and rhythm, tabular figures, every state, a 375px phone, keyboard and screen-reader access, motion, and copy. The app was not run (parallel agents share `.next`; `next dev` and `next build` are off limits), so the findings come from reading the code against the primitives (`table.tsx`, `field.tsx`, `button.tsx`, `globals.css`), not from screenshots. Anything that depends on pixels is marked as unverified in Consequences.

The build was sound: state is derived, requests are cancelled, the states in section 5 all exist. The defects below are small, and most are details that only show up in use.

## Decision

Files touched: `components/ViewLeaderboards.tsx`, `components/LeaderboardTable.tsx`, `components/leaderboard/{BoardPicker,OpenByCode,LiveIndicator,RankingsHead,RankingsSkeleton}.tsx`. No tokens, primitives or `globals.css` changed.

**Table**
- *Focus ring clipped.* `Table` wraps the `<table>` in `overflow-x-auto`, which also clips vertically. The name link is a 44px block in a 48px row, so its default outer ring (2px offset plus 2px line) fell outside the wrapper on the last row and was invisible. The link now uses `focus-visible:-outline-offset-2`, which draws the ring inside the link box where it cannot be clipped.
- *Rank on the left edge.* A right-aligned rank in a 40px column put a one-digit rank about 28px in from the column edge, off the left edge that the board title, caption and header share. The rank column is now left-aligned (`w-8`, `tabular-nums`, no `numeric`) on head, body and skeleton, so `#` and the ranks start at x=0. This departs from the spec's `numeric` on column 1; the figures still align as a column because they are tabular and left-aligned.
- *Baselines.* Name (14px), record and win rate (14px) and ELO (16px) were vertically centred, so the ELO sat off the baseline of its row and, for a name that wraps, floated against the middle of it. Cells now use `align-baseline`, so every figure sits on the first line of the name.
- *Header wrapping.* `Win %` could wrap at its space when the Player column (`w-full`) competes for width. Numeric heads are `whitespace-nowrap`.

**Live indicator and stale data**
- "Reconnecting…" showed for the first moment after every board opened, because the channel had not yet reported. That is a false alarm. `LiveIndicator` now takes `status: "live" | "connecting" | "reconnecting"`: "Connecting…" until this board's channel has reported, "Live" when subscribed, "Reconnecting…" only after it drops. The table stores `{ id, live }` instead of a board id or null.
- When a reload fails while rows are on screen, the old rows stay (as specified) but the indicator used to say "Reconnecting…", which was untrue (the channel is fine) and gave no way out. The footer now says "Couldn't refresh the rankings." with a ghost "Try again" button that runs the effect's own loader through a ref written in the effect. The next successful load or realtime event returns it to the indicator. The message is `role="status"`.

**Pickers and form**
- *Chip size jump.* Selected chips (`secondary`) have a 1px border and unselected (`ghost`) had none, so choosing a board resized two chips by 2px and could re-wrap the row. Unselected chips now carry `border border-transparent`.
- *Long names.* Chips (`max-w-full wrap-anywhere`) and the board title (`min-w-0 wrap-anywhere`) wrap an unbroken string instead of overflowing 375px. The `Shared` badge now aligns to the title's first-line baseline (`items-baseline`) instead of the middle of a wrapped title.
- *Error layout shift.* `Field` is a flex column with a gap and an always-mounted live region, so swapping the hint for an error removed one 6px gap and moved everything below the form up. The form now adds `pb-1.5` while an error is showing.
- *Stale lookup.* Editing the code while a lookup was in flight still opened the board for the old code when it returned. `changeCode` now drops the in-flight lookup (`lookupTicket`, `lookingUp`), so Open always applies to the code in the box.
- *Boards loading.* The skeleton for the board list now has `aria-busy` and an sr-only "Loading your boards" status, matching the table skeleton.

**Checked and left alone:** hierarchy and the single `h2`; the `space-y-8/4/5` rhythm; tabular figures (cells set `tabular-nums`, the table is tabular globally); win/loss never coloured here; en dash in `formatRecord`; 16px inputs and 40px controls; the settle animation (the only motion, `onAnimationEnd` removes it, no remounts, the global reduced-motion rule shortens it to 0.01ms and the event still fires); no `aria-live` on the table; copy matches spec section 6. Migration grep, `uppercase`, `font-mono`, shadow, gradient and `transition-all` checks pass (only the code input uses `uppercase` and `font-mono`).

## Consequences

- Lint and typecheck are clean for all owned files, with no disables.
- `LiveIndicator`'s prop changed from `live: boolean` to `status`; it has no users outside `LeaderboardTable`.
- The stale-data footer is a small addition beyond the spec (the spec only said the indicator falls back). It is the only place the table shows a button after load, and in that rare state the footer grows from about 16px to 32px.
- `align-baseline` and the inset focus ring are untested in a browser. If the row height changes by a pixel against the skeleton rows (which are vertically centred 24px lines), the skeleton needs `align-baseline` on its cells too.
- The board-list skeleton is removed when a viewer has exactly one board (no picker is shown), which moves the code form up by about 56px once. Nothing is typed into it yet in practice, but a stable slot would be better; it needs the picker to render a single board, which the spec rules out.
- Still open for the shell: `AppShell` renders `<ViewLeaderboards isAuthenticated={...} />` without `onCreateBoard`, so the "No boards yet" state has no button. Passing `onCreateBoard={() => setTab("create")}` enables it.
- Candidate primitives, unchanged from ADR 211: `BoardPicker`, `LiveIndicator`, a table skeleton.

## Alternatives considered

- **Padding the table wrapper to keep the outer focus ring.** The wrapper belongs to `Table`, which this team does not own; an inset ring needs no change to it.
- **Shrinking the name link's hit area to fit the ring.** Cuts the 44px thumb target the spec asks for.
- **Right-aligned rank with a narrower column.** Still leaves single digits off the left edge.
- **Auto-retrying a failed reload on a timer.** Adds hidden network behaviour; a visible button is simpler and honest.
- **Hiding the hint permanently and showing only the error.** Loses the only explanation of what the code is.
