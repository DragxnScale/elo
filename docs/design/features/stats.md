# Feature spec: Player and profile stats (stats)

Owner: Feature Lead, stats. Binding for the Builder and the Polish designer of this feature. Read `docs/design/DIRECTION.md` and `docs/design/BRIEFS.md` first; this spec only adds what is specific to this feature and where it makes a decision the brief left open.

Files owned: `app/p/[id]/page.tsx`, `app/u/[username]/page.tsx`, everything under `components/stats/`, plus four new route files that the brief asks for and that live inside the two owned route folders: `app/p/[id]/not-found.tsx`, `app/p/[id]/loading.tsx`, `app/u/[username]/not-found.tsx`, `app/u/[username]/loading.tsx`.

## 1. User goals

| Moment | Who | Goal | What "done" looks like |
|---|---|---|---|
| Tap a name | A friend who just saw the table | "How is Sam actually doing?" | Name, rank and one big rating in the first screen without scrolling, record and win rate beside it |
| Curious | Anyone | "Who beats me most?" | A head-to-head table with every opponent, most played first, each a link |
| Form check | A player about to play | See streak, best streak, peak, average score | Eight figures, label over value, scannable in one glance |
| Trend | A player | "Am I going up?" | A single quiet line with first, last and range, and the net change as a signed number |
| Look back | A player | "When did I play, and what happened?" | Activity heatmap, then the last 20 matches with result, score and rating change |
| Whole picture | Anyone opening `/u/name` | Combined record across every board, and jump to a board | Aggregate figures, a table of boards that each lead to that player's page |
| Share | Anyone | Send a link to a friend | The URL works signed out; nothing on the page needs an account |

Mode is Operate. This is a reading page, but the numbers are the content and the interface is the paper they are written on. It rewards curiosity without becoming a dashboard: no tiles, no charts beyond one line, no badges, no medals.

## 2. Information hierarchy

Weight, strongest first, on the player page:

1. The **rating** (`Stat size="lg"`, 30px semibold) and the **player name** (`h1`, 24px semibold).
2. The other seven stat values (20px semibold), then record and score figures in the lists (14px ink).
3. Section titles (`Section`, 16px semibold).
4. Labels, meta, dates, board names: 14px `muted-foreground`.

DOM and visual order, player page `/p/[id]`:

```
< Board name                 back link, TextLink quiet, 40px tall
Sam Rivera                   h1, text-2xl
#3 of 8 on Wolf Lane · @sam  meta line, text-sm muted; @sam is a link to /u/sam
-- 32px --
Rating   Record   Win rate   W/L ratio     StatGroup, hairline above, 4 columns from sm
1042     12–4     75%        3.00          (Rating is size lg)
Streak   Best     Peak       Avg score
W3       W5       1060       21.3–17.8
-- 40px --
Rating history               Section; hidden under 2 matches
1000 → 1042  +42                    Range 980–1060
~~~~~~~~~~~~~~ one 1.5px line ~~~~~~~~~~~~~~
-- 40px --
Activity                     Section; hidden when no match in the last 26 weeks
[ Activity Terrain, flat by default, brings its own border ]
-- 40px --
Recent matches               Section; rule-separated list, 20 rows max
W  vs Ana             21–17    +12   Oct 24
-- 40px --
Head to head                 Section; hidden with no matches
Opponent        W–L    Played
```

Profile page `/u/[username]`:

```
< Kleos
@sam                          h1
Plays on 3 leaderboards · joined Oct 2026
-- 32px --
Record  Win rate  W/L ratio  Streak       StatGroup (7 items, no rating)
Best streak  Peak  Avg score
-- 40px --
Leaderboards                  Section; Table: Board | W–L | Win % | ELO
Rating history                Section; description "Most active board: Wolf Lane"; hidden under 2 matches there
Activity                      Section; Terrain in its default (terrain) view
Recent matches                Section; spans boards, board name on a second line when more than one board
```

Order change from the incumbent profile: the boards list now comes before the rating chart, as in the brief ("boards list, then rating chart").

## 3. Layout per breakpoint (phone first)

Neither route is rendered inside the shell's tabs or header (they are separate routes with no header), so each page owns its column: `<Container as="main" className="space-y-10 py-8 sm:py-12">`. This is the only place these pages set width or padding. Everything aligns to the left edge of the 768px column. Nothing is centred except `EmptyState`.

Rhythm: page `space-y-10` (40px) between blocks. The lead group (back link, identity, stats) is its own `space-y-8` block, with back link and identity in a `space-y-3` pair, and the identity title and meta in `space-y-1.5`. Section internals use `Section`'s own `space-y-4`.

### 320 to 383px (narrowest phones)

- StatGroup is 2 columns (`StatGroup` default): Rating / Record, Win rate / W/L ratio, Streak / Best streak, Peak / Avg score. Four tidy rows.
- Match rows: result letter, "vs Name" (wraps), score, rating change. **The date column is hidden below 384px** (`hidden min-[24rem]:block`).
- Boards table (profile): Board, W–L, ELO. **Win % hidden below 384px** (`hidden min-[24rem]:table-cell`, head and cells), same threshold as the leaderboard table.
- Head to head: three columns fit; the `Table` wrapper scrolls horizontally as a safety net, never expected to.
- Names wrap (`break-words`), never truncate or clip. The `h1` wraps freely.
- Meta line wraps; the `@username` link stays on one line.

### 384 to 639px

- Date appears in match rows; Win % appears in the boards table.
- StatGroup still 2 columns.

### 640px and up (to the 768px cap)

- StatGroup is 4 columns: row 1 Rating, Record, Win rate, W/L ratio; row 2 Streak, Best streak, Peak, Avg score. On the profile (no rating) the 7 items fill 4 + 3.
- Nothing else changes; the column stays 768px. The Terrain draws at the column width (`max-w-none`).

## 4. Components

All stats components are server-safe: no `"use client"`, no hooks, no state. Keep every export name and prop; optional props may be added.

### 4.1 `StatGrid` (`{ stats, elo? }`)

One `StatGroup columns={4}` containing `Stat`s in this order: Rating (only when `elo !== undefined`, `size="lg"`), Record, Win rate, W/L ratio, Streak, Best streak, Peak, Avg score.

| Label | Value | Rule |
|---|---|---|
| Rating | `String(elo)` | Plain integer, ink, `size="lg"`. The only 30px figure on the page |
| Record | `formatRecord(wins, losses)` from `@/lib/utils` | En dash. `0–0` with no matches (kept) |
| Win rate | `formatWinRate(winRate)` | `67%`, no decimals |
| W/L ratio | `formatRatio(winLossRatio)` | Two decimals |
| Streak | `W3` / `L2` | `tone="win"` for W, `tone="loss"` for L. Add `<span className="sr-only"> (3 wins in a row)</span>` so the letter has a spoken form |
| Best streak | `W5` | `tone="win"` (it is always a win streak). Dash when 0 |
| Peak | `String(peakElo)` | Ink |
| Avg score | `21.3–17.8` | One decimal, en dash, via `formatScore(a, b, 1)` |

Empty value is `<span className="text-muted-foreground">—</span>` (an em dash, muted) for every figure that has no data. No box, no cell background, no `gap-px`, no `#050810`. No `font-mono`. All colour comes from `Stat`'s `tone`.

The profile's aggregate `Peak` and `Streak` are computed across boards by `lib/stats` (existing behaviour, kept).

### 4.2 `EloSparkline` (`{ series }`, new optional `boardName?: string`)

- Renders `null` for fewer than **3 points** (fewer than 2 matches). This applies the brief's "hidden under 2 matches" on both pages. (The incumbent player page showed a two-point line after a single match.)
- Renders its own `<Section title="Rating history" description={boardName && "Most active board: " + boardName}>` so the heading collapses with the chart and there is never an empty frame.
- Inside, a `<figure>` with no border, no padding, no background, no radius:
  - `<figcaption>`: `flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums`. Left: `{first} → {last}` then `<Delta value={last - first} />` (the net direction: sign plus colour, the only colour in the block). Right: `Range {min}–{max}` (en dash).
  - `<svg>` `role="img"`, `viewBox 0 0 600 120`, `preserveAspectRatio="none"`, `className="mt-3 h-24 w-full text-foreground sm:h-28"`, aria-label unchanged: `Rating went from {first} to {last} over {n} matches`.
  - One `<polyline>`: `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.5}`, `vectorEffect="non-scaling-stroke"`, `strokeLinejoin="round"`, `strokeLinecap="round"`. No area fill, no dots, no gradient, no axis, no grid, no hover.
  - If `min === max`, draw the line at mid-height instead of the bottom edge.
- Plain integers (no thousands separator) so numbers match the leaderboard table.

### 4.3 `MatchList` (`{ matches, opponents, boards?, limit = 20 }`, new optional `emptyMessage?: React.ReactNode`)

Sorting (newest first) and `limit` are unchanged. The list is a rule-separated `<ul>`: `border-t border-border divide-y divide-border`, no outer border, no radius.

Each `<li>`: `grid items-baseline gap-x-3 py-3 text-sm min-h-12`, with fixed column widths so scores and deltas form true columns:

| Column | Width | Content |
|---|---|---|
| Result | `1.25rem` | `<ResultMark result>` |
| Opponent | `minmax(0,1fr)` | `<span className="text-muted-foreground">vs </span><TextLink variant="plain" href="/p/{id}">Name</TextLink>`, wrapping (`break-words`). When `boards` is passed, a second line `<p className="text-muted-foreground">{board name}</p>`; no board line when the map has no entry |
| Score | `4.5rem`, `text-right tabular-nums` | `formatScore(pointsFor, pointsAgainst)` |
| Change | `2.5rem`, `text-right` | `<Delta value={m.change} />` (`block`). `0` shows muted `0`, not `+0` |
| Date | `3rem`, `text-right text-muted-foreground`, `hidden min-[24rem]:block` | `<time dateTime={playedAt}>Oct 24</time>` |

Two grid templates: `grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_2.5rem]` below 384px, and `min-[24rem]:grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_2.5rem_3rem]` from 384px. Do not use `subgrid`, because this cannot be checked in a browser in this round.

Dates use `toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })` so the server output is deterministic and agrees with the Terrain's UTC days.

Empty (`recent.length === 0`): a left-aligned muted paragraph, `border-t border-border pt-4 text-sm text-muted-foreground`, content `emptyMessage ?? "No matches yet. Record one from the Edit tab."`. No centring, no frame.

### 4.4 `HeadToHeadTable` (`{ rows, names }`)

Still returns `null` for no rows. Built from the `Table` family:

- `<caption className="sr-only">Record against each opponent, most played first</caption>`.
- Head: `Opponent` | `W–L` (`numeric`) | `Played` (`numeric`).
- Rows: `TableCell` with `<TextLink variant="plain" href="/p/{opponentId}">{names[id] ?? "Unknown"}</TextLink>`; `W–L` via `formatRecord`; `Played` in `text-muted-foreground`. Order is the order of `rows` (most played first, from `lib/stats`).
- No `font-mono`, no slate colours, no row colour for record (a record is not a result, so it stays ink).

### 4.5 New `components/stats/format.ts`

Pure helpers shared by the components (no React):

- `formatScore(a: number, b: number, digits = 0): string`: `toFixed(digits)` both, replace a leading `-` with a true minus `−` (U+2212), join with an en dash `–`; if either side is negative, join with ` – ` (spaces) so `−3 – 10` stays readable. Examples: `21–17`, `−3 – 10`, `21.3–17.8`.
- `formatShortDate(iso: string): string` (the `Oct 24` format above).
- `formatMonthYear(iso: string): string`: `en-US`, `{ month: "short", year: "numeric", timeZone: "UTC" }`, giving `Oct 2026`.

## 5. Pages

### 5.1 `/p/[id]`

- Wrap `getPlayerDetail` in `React.cache` at module level (`const getDetail = cache(getPlayerDetail)`) and use it in both `generateMetadata` and the page, so one request makes one set of queries. Behaviour is otherwise unchanged (`notFound()` on `"error" in detail`; metadata strings unchanged).
- Back link: `<TextLink variant="quiet" href="/" className="-ml-1 inline-flex min-h-10 items-center gap-1">` with a lucide `ChevronLeft` (`size-4`, `aria-hidden`) and the board name. The direction forbids glyph arrows as icons, so this replaces the brief's `←` character; href stays `/`.
- Identity: `h1` name (`text-2xl font-semibold tracking-tight break-words`). Meta: `<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">` with `#{rank} of {players.length} on {leaderboard.name}` and, when `username` exists, `<span aria-hidden>·</span>` and `<TextLink variant="quiet" href="/u/{username}" className="underline decoration-border-strong">@{username}</TextLink>`. (Quiet links underline only on hover, which is invisible on touch; the always-on hairline underline is what makes the handle read as a link.) Omit the rank phrase if `rank === 0`.
- Then `StatGrid stats elo`, then:
  - `EloSparkline series={eloSeries(history)}` (renders its own Section or nothing);
  - Activity: rendered only when `activity.data.some((n) => n > 0)`: `<Section title="Activity"><ActivityTerrain data endDate title="Matches played" unit={["match","matches"]} defaultFlat className="terrain-theme max-w-none" /></Section>`;
  - `<Section title="Recent matches"><MatchList matches={history} opponents={opponents} /></Section>`;
  - when `history.length > 0`: `<Section title="Head to head" description="Record against each opponent, most played first."><HeadToHeadTable rows={headToHead(history)} names={names} /></Section>`.

### 5.2 `/u/[username]`

- `generateMetadata` unchanged. `getProfileDetail(decodeURIComponent(username))` and `notFound()` unchanged.
- Back link as above, label `Kleos`.
- Identity: `h1` `@{profile.username}`; meta `Plays on {n} leaderboard(s) · joined {formatMonthYear(created_at)}` (singular for 1). With no boards the meta is `Joined {Mon YYYY}`.
- **No boards** (`players.length === 0`): render only the lead group (back link, identity) and `<EmptyState title="Not on any leaderboard yet" description="Ask a board owner to link this account." />`. No stat group, no sections.
- Otherwise: `StatGrid stats={overall}` (no `elo`), then the sections in this order:
  1. `Leaderboards`: `Table`. Columns `Board` (`TextLink plain` to `/p/{player.id}`, with `className="-my-3 block py-3"` so the tap target is the whole 44px row height), `W–L` (`numeric`, `formatRecord`), `Win %` (`numeric`, hidden under 384px, `formatWinRate`), `ELO` (`numeric`, `text-base font-semibold`, the right-most and strongest column, plain `player.elo`). Header row text `Board`, `W–L`, `Win %`, `ELO`. Row order unchanged. This replaces the incumbent list of full-width link rows: the name is the link (as in the leaderboard table), and the table gives the columns real headers.
  2. `EloSparkline series={eloSeries(mostActive.history)} boardName={mostActive.leaderboard.name}` when `mostActive` exists (the component hides itself under 2 matches).
  3. Activity (same collapse rule), default view: no `defaultFlat`, className `terrain-theme max-w-none`.
  4. `Recent matches` with `boards={players.length > 1 ? boardNames : undefined}`; `emptyMessage="No matches yet."` on the profile.
- `mostActive` is chosen as now (most matches; first wins ties).

### 5.3 `not-found.tsx` (both routes)

`<Container as="main" className="flex min-h-[60vh] items-center py-8">` containing a centred `EmptyState`:

| Route | Title | Description | Action |
|---|---|---|---|
| `/p/[id]` | That player doesn't exist | The link may be old, or the player was removed. | `<Link href="/" className={buttonVariants({ variant: "secondary" })}>Back to Kleos</Link>` |
| `/u/[username]` | That user doesn't exist | Check the username, or open a board with its share code. | same |

No async, no data. The apostrophe is a straight `'` in source (`&apos;` in JSX).

### 5.4 `loading.tsx` (both routes)

Same `Container as="main"` and rhythm, with `aria-busy` and a `<p className="sr-only" role="status">Loading player</p>` (`Loading profile` on `/u`). Skeletons shaped like the content so nothing shifts:

- back link: `Skeleton h-4 w-24`; title `Skeleton h-8 w-48`; meta `Skeleton h-4 w-56`;
- stat group: a plain `div` with the same classes as `StatGroup` (`grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-5 sm:grid-cols-4`, a real `dl` is not valid with `aria-hidden` children), eight cells each `Skeleton h-4 w-16` over `Skeleton h-7 w-20` (the first `h-9`);
- below it, a `Skeleton h-5 w-32` section title and three `Skeleton h-12 w-full` rows.

Trade-off recorded in the ADR: with `loading.tsx` Next streams the response, so a missing id returns status 200 with `noindex` instead of 404.

## 6. States

| State | Player | Profile |
|---|---|---|
| Loading | `loading.tsx` skeleton, see 5.4 | same |
| Success | Full page | Full page |
| Not found | `not-found.tsx`; page calls `notFound()` | same |
| Error (fetch fails) | The server actions return only `"error" in detail`, so a failed read and a missing row look the same and both land on the not-found page. Known limitation; the copy says "may be old" and not "was deleted" | same |
| No matches | Stat group shows `0–0` and dashes; rating still shown; rating history, Activity and Head to head sections collapse; Recent matches shows the muted sentence | Stat group as left; chart, Activity collapse; boards table still shows; Recent matches shows "No matches yet." |
| One match | Rating history hidden (needs 2); everything else shows | Chart hidden |
| Activity outside the last 26 weeks | Activity section collapses | same |
| Profile with no boards | n/a | `EmptyState`, nothing else |
| Signed out / signed in | Identical. The pages read public data; they show no sign-in prompt and no account controls | Identical |

## 7. Copy (final strings)

| Where | String |
|---|---|
| Player back link | `{leaderboard.name}` |
| Profile back link | `Kleos` |
| Player meta | `#3 of 8 on Wolf Lane` |
| Username link | `@sam` |
| Profile meta | `Plays on 3 leaderboards · joined Oct 2026`; `Plays on 1 leaderboard · joined Oct 2026`; `Joined Oct 2026` |
| Profile no boards | `Not on any leaderboard yet` / `Ask a board owner to link this account.` |
| Stat labels | Rating, Record, Win rate, W/L ratio, Streak, Best streak, Peak, Avg score |
| Section titles | Rating history, Activity, Recent matches, Head to head, Leaderboards |
| Rating history description (profile) | `Most active board: {name}` |
| Sparkline caption | `1000 → 1042` + `+42`; `Range 980–1060` |
| Terrain title and unit | `Matches played`, `match` / `matches` (props kept) |
| Match row | `W` / `L`, `vs Ana`, `21–17`, `+12`, `Oct 24` |
| Empty matches | `No matches yet. Record one from the Edit tab.` (profile: `No matches yet.`) |
| Head to head description | `Record against each opponent, most played first.` |
| Head to head table | Opponent, W–L, Played; unknown opponent `Unknown` |
| Boards table | Board, W–L, Win %, ELO |
| Not found (player) | `That player doesn't exist` / `The link may be old, or the player was removed.` / `Back to Kleos` |
| Not found (user) | `That user doesn't exist` / `Check the username, or open a board with its share code.` / `Back to Kleos` |
| Loading (sr-only) | `Loading player`, `Loading profile` |

Sentence case everywhere. En dash in every record and score, true minus in every signed number, em dash for no data.

## 8. Primitives to use

`Container`, `Section`, `StatGroup`, `Stat`, `Delta`, `ResultMark`, `Table` family, `TextLink`, `EmptyState`, `Skeleton`, `buttonVariants`, `cn`, `formatRecord` (and optionally `formatSigned`, not needed since `Delta` formats). Icons: lucide `ChevronLeft` only, in the back links. Kokonut `ActivityTerrain` through props and `className` only.

Local candidates the director may promote: a rule-separated "row list" (the `MatchList` layout) and a `BackLink` (chevron + quiet `TextLink`); the view and manage teams are likely to want both.

## 9. Interactions and motion

- No motion is authored on these pages. Nothing animates on load. The `Skeleton` pulse in `loading.tsx` is the only animation and is collapsed by `prefers-reduced-motion` in globals.
- Hover and focus: link colour and underline at 150ms ease-out (inside `TextLink`), table row hover wash (inside `TableRow`). Match rows have no hover state (they are not interactive as a row).
- Settle flash is not used here (that is the leaderboard's moment).
- Pages are static server renders; they do not subscribe to realtime. A rating shown here is as of page load (existing behaviour).
- The Activity Terrain's own flat/terrain toggle and drag are vendor behaviour, untouched.

## 10. Accessibility

- One `h1` per page (the name or `@username`); every block heading is an `h2` from `Section`, labelled by `aria-labelledby`.
- Stat figures are a real `dl` with `dt`/`dd`; the `Streak` value carries an sr-only phrase.
- Results never rely on colour: `W`/`L` letters (with Win/Loss labels from `ResultMark`), `+`/`−` signs (with up/down labels from `Delta`), `W3`/`L2` plus the sr-only phrase.
- The sparkline is `role="img"` with the full sentence. The caption repeats the same numbers as visible text, so low-vision users get them at size too.
- Tables have header cells with `scope="col"` (from `TableHead`) and an sr-only caption on head to head.
- Contrast comes from tokens: muted text is 6.5:1 on paper, `win`/`loss` text on `background` is above 4.5:1 in both themes (check `text-win` on `bg-background`, not only on the subtle fill, while reviewing).
- Tap targets: back link 40px; boards-table name 44px; head-to-head cells 44px; opponent links in match rows are inline text in 48px rows (adjacent targets never overlap).
- Focus uses the global 2px ring; no `outline-none` anywhere in these files.
- The page is a `main` landmark; `not-found` and `loading` are also `main` so the landmark never disappears.
- Dates: `<time dateTime>` with a short visible form.
- Zoom to 200% and 320px width: no horizontal scroll on the page (tables are inside the scrolling wrapper if they ever overflow, which they should not).

## 11. Behaviour that must survive

1. `getPlayerDetail` / `getProfileDetail` usage, `notFound()` on `"error" in detail`, `decodeURIComponent(username)`.
2. `generateMetadata` titles on both routes, exactly as now (`Player · Kleos`, `{name} · {board} · Kleos`, `@{username} · Kleos`).
3. Every stat: rating (player only), record, win rate, W/L ratio, current streak, best streak, peak, average score. Same formulas from `lib/stats`.
4. `#rank of players.length on board`, and the `@username` link to `/u/{username}` when linked.
5. Sparkline: `role="img"`, aria-label sentence, series from `eloSeries`.
6. Activity Terrain props `data`, `endDate`, `title`, `unit`, `defaultFlat` (player only).
7. Match list: sorted newest first, `limit` default 20, opponent links to `/p/{id}`, `Unknown` fallback, board name only when `boards` is given (profile with more than one board).
8. Head to head: sorted by lib (most played first), links to the opponent, shown only when there is history.
9. Profile per-board list: one row per linked player slot, each leading to `/p/{player.id}`, showing W–L, win %, rating; rating chart for the most active board (needs 2+ matches); aggregate stats across boards.
10. Profile "joined" month/year and the leaderboard count with singular/plural.
11. Props of `StatGrid`, `MatchList`, `EloSparkline`, `HeadToHeadTable` remain compatible (only optional additions).
12. Both pages remain server components with no client state.

## 12. Removed on purpose

Rounded-xl borders around every block; the 1px-gap grid cells and `bg-[#050810]`; the cyan sparkline stroke and cyan rating colour; every `slate-*`, `emerald-*`, `red-*`, `cyan-*` class; `font-mono` on figures; divide-y card around the match list; `+0` (now `0`); `text-sm font-medium text-slate-400` section headings; hand-written `max-w-3xl px-4 py-10` on `main`.

## 13. Cross-team notes

- Neither route has the shell header, so there is no theme toggle on stats pages. The stored or system theme still applies through `ThemeScript` in the root layout. A slim shared header is a shell candidate (the shell spec already lists it).
- The dash in `Delta` is a true minus, so `formatSigned` stays in `lib/utils` and is not duplicated.
- Direction section 6 shows ratings both as "1,042 ELO" and as "plain integer". The stats screens use plain integers everywhere (matching the leaderboard table). The director should settle one rule.
- The `not-found.tsx` files are segment-level and only apply to these two routes; the shell's `app/not-found.tsx` covers all other unknown URLs.

## 14. Acceptance checklist

- `npx tsc --noEmit` shows no errors in `app/p`, `app/u`, `components/stats`.
- `npx eslint app/p app/u components/stats` is clean, no disables.
- The Direction migration grep (`grep -rnE "(slate|cyan|violet|emerald|red|amber|zinc|gray|neutral)-[0-9]|bg-\[#|input-futuristic|btn-primary|btn-secondary|select-match|bg-grid" app/p app/u components/stats`) returns nothing.
- `grep -rnE "font-mono|uppercase|tracking-(wide|widest)|transition-all|shadow-|gradient|rounded-xl" app/p app/u components/stats` returns nothing.
- Every file in `components/stats` still exports the same names; both pages import only from allowed places.
- Records and scores use `–`, deltas use `−`, empty values use `—`.
- Every item in section 11 can be pointed to in the code.
