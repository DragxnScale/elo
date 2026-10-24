# 420. Player and profile stats: build

Status: Accepted

## Context

ADR 410 and `docs/design/features/stats.md` specify the redesign of the player page (`/p/[id]`) and profile page (`/u/[username]`) in the "Scorecard" direction. The incumbent pages wrapped every block in `rounded-xl` borders, used a 1px-gap grid on a hard-coded `#050810`, drew a cyan sparkline, set figures in `font-mono`, and used raw `slate-*`, `emerald-*` and `red-*` classes. The builder's job was to implement the spec in the files the stats team owns, with the shared primitives in `components/ui/`, preserving every behaviour in spec section 11.

## Decision

- `components/stats/format.ts` (new, pure): `formatScore(a, b, digits = 0)` uses `toFixed`, turns a leading `-` into a true minus (U+2212), joins with an en dash, and uses ` – ` (spaced) if either side is negative (`21–17`, `−3 – 10`, `21.3–17.8`). A negative zero such as `-0.0` is shown as `0.0`. `formatShortDate` (`Oct 24`) and `formatMonthYear` (`Oct 2026`) use `en-US` with `timeZone: "UTC"` so server output is deterministic and agrees with the heatmap's UTC days.
- `StatGrid`: one `StatGroup columns={4}` of `Stat`. Order: Rating (only with `elo`, `size="lg"`), Record, Win rate, W/L ratio, Streak, Best streak, Peak, Avg score. Streak and Best streak take `tone` win/loss; Streak carries an sr-only phrase ("3 wins in a row", "1 loss in a row", "2 losses in a row"). Empty values are a muted em dash. No boxes, no `font-mono`.
- `EloSparkline`: hidden under 3 points (2 matches). It renders its own `Section` ("Rating history", optional "Most active board: X") so the heading collapses with the chart. A borderless `figure` with a caption (`first → last` plus `Delta` of the net change on the left, `Range min–max` on the right) and one 1.5px `currentColor` polyline with non-scaling stroke and round joins. A flat series is drawn at mid-height. The aria-label sentence is unchanged. New optional prop `boardName`.
- `MatchList`: sorting and `limit` unchanged; new optional `emptyMessage`. A rule-separated `ul` with a fixed grid per row (`1.25rem | 1fr | 4.5rem | 2.5rem`, plus `3rem` for the date from 384px, via two explicit templates and no subgrid). `ResultMark`, `vs` plus a plain `TextLink`, a board line only when `boards` has an entry, `formatScore`, `Delta` (`0` is muted, not `+0`), and a `<time dateTime>`. Names wrap and are never truncated.
- `HeadToHeadTable`: built from the `Table` family, with an sr-only caption, columns Opponent | W–L | Played, and `formatRecord`. Returns `null` for no rows.
- `app/p/[id]/page.tsx`: `const getDetail = cache(getPlayerDetail)` shared by `generateMetadata` and the page (one set of queries per request). Metadata strings and `notFound()` unchanged. `Container as="main"` with `space-y-10`, a lead group (back link with `ChevronLeft`, `h1`, meta line, `StatGrid`), then sparkline, Activity (only when some day has a match; `defaultFlat`, `terrain-theme max-w-none`), Recent matches, and Head to head (only with history). The rank phrase is omitted when `rank === 0`, and the middle dot only appears when both rank and username are present.
- `app/u/[username]/page.tsx`: same frame. With no boards, only the lead group and `EmptyState`. Otherwise `StatGrid` without `elo`, a `Leaderboards` table (Board link with `-my-3 block py-3`, W–L, Win % hidden under 384px, ELO right-most in `text-base font-semibold`), the sparkline with `boardName`, Activity in the default view, and Recent matches (board names only when more than one board; `emptyMessage="No matches yet."`). Meta uses `formatMonthYear` and singular/plural, or `Joined Oct 2026` with no boards. The boards list now comes before the chart, as the spec orders it.
- `not-found.tsx` and `loading.tsx` for both routes, with the final copy from spec 5.3 and 5.4. The loading skeletons mirror the page (back link, title, meta, an 8-cell stat grid, a section title and three rows) with an sr-only `role="status"` line and `aria-busy`.

Verification: `npx tsc --noEmit` shows no errors in the owned files; `npx eslint app/p app/u components/stats` is clean with no disables; both spec section 14 greps return nothing. I did not run a build or a browser, per the workflow rules, so the visual result is unchecked in a real viewport.

## Consequences

- Both pages are server components with no client state and use only shared tokens, so they follow the theme automatically in light and dark.
- A profile with one match no longer shows a two-point line, and a player page no longer shows a chart after a single match (the incumbent did). This is intended.
- With `loading.tsx`, Next streams the response, so a missing id now returns status 200 with `noindex` rather than 404. The page still renders the not-found UI. This is the trade-off the spec accepted.
- A failed read and a missing row are indistinguishable (the actions only return `"error" in detail`), so both land on not-found. The copy says "may be old", not "was deleted".
- Neither route has the shell header, so these pages have no theme toggle. The stored or system theme still applies through `ThemeScript`.
- Match rows have fixed column widths, so a very long score such as `−100 – 100` could crowd the opponent column on a 320px phone. The name column wraps rather than truncating.

## Alternatives considered

- Subgrid for the match rows: rejected because it cannot be verified in a browser in this round; two explicit templates are enough.
- Keeping the two-point sparkline: rejected because the brief says "hidden under 2 matches".
- Putting `Section` in the pages and keeping `EloSparkline` a bare chart: rejected because the heading would remain when the chart hides, leaving an empty frame.
- Putting `formatScore` in `lib/utils`: not allowed for this team, so it lives in `components/stats/format.ts`.

## Candidate primitives

- `BackLink` (chevron plus quiet `TextLink`, used identically on both pages, `not-found` aside).
- A rule-separated "row list" (the `MatchList` layout), likely useful to the view and manage teams.
- `formatScore` in `lib/utils` next to `formatRecord` and `formatSigned`.
