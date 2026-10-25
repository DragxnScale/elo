# 430. Player and profile stats: polish

Status: Accepted

## Context

ADR 420 built the player page (`/p/[id]`) and profile page (`/u/[username]`) to `docs/design/features/stats.md`. The builder could not open a browser, so nothing had been checked at phone width, with a screen reader, or against the layout shift between the loading skeleton and the real page. This pass reviews the build against DIRECTION.md and the spec and fixes what a careful read of the code and a server render of the components turned up. Behaviour (spec section 11) is unchanged; `lib/**`, `components/ui/**`, `globals.css`, Kokonut and `app/actions.ts` were not touched.

## Decision

Findings, each fixed in the files the stats team owns:

1. **The date vanished on most small phones.** The date column was hidden below 384px, which includes 375px devices, so the "when" of a match disappeared exactly in the phone-at-the-table use. `MatchList` now moves the date under the opponent name (joined to the board name by a middle dot when the profile shows boards) below 384px, and from 384px it returns to its own column. The duplicate `<time>` is `display: none` at the other width, so a screen reader reads one. Rows stay on the same fixed grid.
2. **Opponent links were 20px tall.** The row is 48px, but only the line of text was tappable. The link gets a `before:` pseudo-element reaching 12px above and below, so the target is 44px with no layout change. In `HeadToHeadTable` the link uses `-my-3 block py-3`, the same pattern as the boards table, so the whole 44px cell height is the target (the spec promised 44px; the build gave the text height).
3. **The not-found pages had no `h1`.** `EmptyState` renders its title as a `<p>`. The shell's 404 already works around this with a local build; the stats routes now do the same with `NotFoundState` (real `h1`, `text-2xl`, balanced; the same secondary "Back to BowlBoard" button). It fills the page with `flex-1` (the body is a flex column) instead of a `60vh` guess, and each route sets its own `<title>` (`Player not found · BowlBoard`, `User not found · BowlBoard`).
4. **The skeleton shifted when content arrived.** The back link skeleton was 16px but the real link is 40px tall (a 24px jump), the meta line was 16px against 20px, the section title 20px against 24px, and the profile skeleton drew a rating-sized first cell for a page with no rating. A shared `PageSkeleton` now matches each height (40 / 32 / 20 / stat cell 52, 60 for the headline), takes `stats` (8 on `/p`, 7 on `/u`) and `headline`, and the two `loading.tsx` files collapse to one line each. The decorative stat grid is `aria-hidden`; the `role="status"` line stays.
5. **Screen-reader phrasing.** Best streak now carries the same spoken phrase as Streak ("W5 (5 wins in a row)") through one `streakPhrase` helper. In the sparkline caption `1042 → 1060` reads "1042 to 1060" and `Range 980–1060` reads "Range 980 to 1060" (the arrow and en dash are `aria-hidden`, an sr-only "to" replaces them). The visible text is unchanged.
6. **Table naming.** The profile's boards table gets an sr-only caption ("Record and rating on each leaderboard"), matching the head-to-head table.
7. **Back link box.** `inline-flex` inside a block adds a stray line-box descent under the 40px link. A new local `BackLink` uses `flex w-fit min-h-10`, shrinks the chevron never (`shrink-0`), and wraps a long board name. Both pages use it, replacing two copies.
8. **Edge cases in the identity block.** With no rank and no linked username the meta `<p>` rendered empty and still took a gap; it now renders only when it has content. The meta line wraps long words (`break-words`, `min-w-0` on the username link) so a very long handle cannot push the page sideways at 320px.

Files: new `components/stats/BackLink.tsx`, `NotFoundState.tsx`, `PageSkeleton.tsx`; edited `MatchList.tsx`, `HeadToHeadTable.tsx`, `StatGrid.tsx`, `EloSparkline.tsx`, both `page.tsx`, both `loading.tsx`, both `not-found.tsx`. No new tokens, no new motion. The pages still animate nothing on load; the skeleton pulse is the only animation and `prefers-reduced-motion` collapses it in globals.

Checked: `npx tsc --noEmit` has no errors in the owned files; `npx eslint app/p app/u components/stats` is clean with no disables; the spec section 14 greps (and `outline-none`, `eslint-disable`) return nothing; `MatchList` and `StatGrid` were server-rendered in Node and the markup read back (date placement, pseudo-element classes, sr-only phrases, `21 – −3` style negative scores). No browser or build was run, so spacing and the 320 to 375px behaviour are still verified by reading, not by eye.

## Consequences

- Small phones keep the date, at the cost of a second muted line in every match row below 384px. Rows are about 52px tall there instead of 48px.
- The 44px link target in match rows is a pseudo-element, so it also catches taps in the 12px above and below the name; the rows are at least 48px, so two targets never overlap.
- Loading to loaded should no longer move the layout; any later change to a heading size or stat style must be mirrored in `PageSkeleton`.
- Not-found pages are a little more code than `EmptyState`, until that primitive can take a heading level.

## Alternatives considered

- Showing the date in its own column from 320px: rejected, it takes 48px plus a gap from a 288px column and squeezes the opponent name to about 70px.
- Stretching the whole match row into a link: rejected, the spec says rows are not interactive as a row, and it would hijack taps on the score and text selection.
- Keeping the 60vh not-found layout: rejected for `flex-1`, which centres on the real viewport and survives mobile browser chrome.
- Aligning the baseline of the 30px rating with the 20px figures beside it: the rating sits about 7px lower than its neighbours because `StatGroup` top-aligns cells. A fix needs a `StatGroup` option (baseline alignment of `dd`), which is outside this team's files.

## Open issues and candidates

- **Back link destination.** The player back link says the board name but goes to `/`, because the shell keeps the open board in client state and has no URL for it. A deep link such as `/?code=ABC123` in the shell would let the label tell the truth. Shell team.
- **Candidate primitives:** `BackLink` (now a single local component, ready to move to `components/ui`), `NotFoundState` or a heading level on `EmptyState`, `PageSkeleton`, a rule-separated row list (the `MatchList` layout), and `formatScore` in `lib/utils`.
- **`Delta` and `ResultMark` use `aria-label` on a bare `<span>`.** Several screen readers ignore that. A `sr-only` text or a `role="img"` in `components/ui/stat.tsx` would make it reliable. UI primitives owner.
- A very long negative score (`−100 – 100`) wraps onto two lines in its 72px column instead of overflowing; acceptable, but unchecked in a browser.
