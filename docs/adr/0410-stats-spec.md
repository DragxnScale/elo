# 410. Player and profile stats: design spec

Status: Accepted

## Context

The player page (`/p/[id]`) and the profile page (`/u/[username]`) are where the group's curiosity is answered: how a friend is doing, who beats whom, how a streak or a rating is trending. They are read on a phone, usually after tapping a name on the leaderboard. The incumbent implementation (`app/p/[id]/page.tsx`, `app/u/[username]/page.tsx`, `components/stats/*`) uses the replaced neon look: a rounded-xl bordered box around every block, an 8-cell stat grid built from 1px-gap cells on a hard-coded `#050810`, a cyan sparkline and cyan rating, `font-mono` figures and slate/emerald/red colours.

Facts that shaped the decisions:

- `StatGrid`, `MatchList`, `EloSparkline` and `HeadToHeadTable` are shared by both routes, so their props must stay compatible.
- Neither route sits inside the shell, so each owns its page column and has no header or theme toggle.
- `getPlayerDetail` is called twice per request (in `generateMetadata` and in the page), and the server action cannot be edited.
- A single match produces a two-point "line" on the player page today, while the profile hides the chart under two matches. The brief says to hide it under two matches.
- Failed reads and missing rows are indistinguishable from the actions' return value.
- Chrome cannot be run in this round (no `next dev`, no `next build`), so the spec has to be precise enough that a code-level review can verify it.

This ADR records the spec in `docs/design/features/stats.md`. It contains no UI code.

## Decision

Specify both pages as a hand-written player card: a name, one large rating, then plain type, with every block separated by whitespace and hairlines.

**Page structure.** Each page renders `<Container as="main" className="space-y-10 py-8 sm:py-12">`. The lead group is back link, identity, and the stat group. After it come sections in the brief's order. A section whose data is empty is not rendered at all, instead of showing an empty frame.

**StatGrid.** A single `StatGroup` of eight `Stat`s in the existing order. Rating is the only `size="lg"` figure and sits in the first cell, so the grid is 4 by 2 from `sm` and 2 by 4 on phones with no orphan cell. Win and loss streaks use `tone`, the best streak is always a win streak, everything else is ink. Missing data is a muted em dash. The profile passes no rating, which gives 7 cells.

**Rating history.** `EloSparkline` renders its own `Section`, so the heading disappears with the chart. One 1.5px `currentColor` (ink) line, no fill, dots or axes. Above it a caption shows `first → last` with a `Delta` for the net change (the only colour, and always signed) and the min to max range in muted text. The component now hides under two matches on both pages, and a flat series is drawn at mid-height. A new optional `boardName` labels the profile chart.

**Activity.** `ActivityTerrain` inside `<Section title="Activity">` with `className="terrain-theme max-w-none"`, `defaultFlat` on the player page only, no extra Surface. The section is omitted when no match falls in the 26-week window.

**Recent matches.** A rule-separated list with fixed column widths (result, opponent, score, change, date) so scores and changes line up as columns. Result uses `ResultMark`, change uses `Delta`, score uses a new `formatScore` helper (en dash, true minus, spaced dash when a side is negative). Board name goes on a second muted line when the list spans boards. The date column hides under 384px. Dates are formatted in UTC with `en-US` so they match the Activity Terrain's UTC days and do not vary by server locale.

**Head to head.** The `Table` family with an sr-only caption and a short description under the section title. Order and links are unchanged.

**Profile boards.** A `Table` (Board, W–L, Win %, ELO) instead of the incumbent list of link rows. The board name is the link, with a block link area so the tap target is the whole 44px row, as in the leaderboard table. The boards table comes before the rating chart, as in the brief.

**States.** Segment-level `not-found.tsx` for each route (centred `EmptyState` with a "Back to BowlBoard" button), and `loading.tsx` skeletons shaped like the page. The profile with no boards shows only the lead group and an `EmptyState`. The empty-matches sentence is muted, left-aligned and sits under its own heading.

**Small decisions beyond the brief.**

- The back link uses a lucide `ChevronLeft` rather than the `←` character, because the direction forbids glyph arrows as icons.
- The `@username` link is a quiet link with an always-visible hairline underline, so it is recognisable on touch where hover does not exist.
- `getPlayerDetail` is wrapped in `React.cache` inside the page module so metadata and page share one set of queries. Behaviour is unchanged.
- Ratings are plain integers (`1042`), matching the leaderboard table.
- Hit areas: the back link is 40px and the table names 44px; opponent links in match rows remain inline text.

## Consequences

- The pages read as a written-up player card in light and dark; the rating is the largest figure and the name is the second, with no boxes anywhere. Colour appears only for results, signs and the streak.
- All current behaviour survives (itemised in section 11 of the spec). The visible behaviour changes are the intended ones: the chart needs two matches on the player page too, a zero rating change reads `0` instead of `+0`, and empty sections collapse.
- Adding `loading.tsx` makes Next stream the response. For an unknown id the page now returns status 200 with a `noindex` robots tag rather than 404. For a private group scoreboard this is acceptable, and the gain is that tapping a name from the leaderboard shows a skeleton instead of a frozen screen across three sequential database round trips.
- Using `React.cache` halves database work per page view without touching `app/actions.ts`.
- Failed reads still show "That player doesn't exist", because the actions do not expose the difference. The copy hedges ("may be old"). Fixing it needs an action change, which this team does not own.
- No theme toggle on these routes until the shell adds a shared slim header. The theme still applies from storage or the system.
- The ratings-as-plain-integer rule conflicts with the direction's "1,042 ELO" prose example; the director should settle one rule.
- Because no browser is available, the Polish pass is a code-level review against the spec, with the acceptance greps as the mechanical check.
- Three local patterns are candidate primitives: the rule-separated row list, a back link with a chevron, and the `formatScore` helper.

## Alternatives considered

- **Rating as a wide hero cell (spanning two columns, or its own row above the group).** Stronger emphasis, but it leaves an odd number of cells in a four-column grid and pushes the first screen down on a phone. A single `lg` figure in a regular cell keeps the grid tidy and is still the largest number on the page.
- **Two stat groups (headline, then the rest).** Two hairlines make the page look like two components. One group reads as one card.
- **Drawing the net direction by colouring the line green or red.** The brief allows it, but a coloured line is a decorative claim about a series that may wobble. A signed `Delta` in the caption states the direction with a sign and colour and keeps the line neutral.
- **Putting the chart's Section in the page.** Then each page would need its own guard for the hide rule. Owning the Section in the component keeps the rule in one place.
- **A boxed or hover-row-link list for profile boards (as before).** Keeps "whole row is a link", but gives no column headers, and the rating column is easy to confuse with win percentage. The table matches the leaderboard users already know.
- **`subgrid` for match columns.** Self-aligning columns without fixed widths, but unverifiable in this round. Fixed widths are robust and good enough for numbers of this size.
- **`EmptyState` for the no-matches sentence.** It centres and adds 48px of padding under a heading that already says what the section is. A muted left-aligned sentence is quieter.
- **No `loading.tsx` (keeps 404 for unknown ids).** Better for crawlers, worse for the one person tapping a name on a slow connection. Rejected in favour of the skeleton.
- **Moving the metadata fetch out and letting it be unauthenticated.** Out of scope: the data layer is read-only for this team.
- **A theme toggle on the stats pages.** The direction reserves it for the shell.
