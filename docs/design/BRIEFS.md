# Feature briefs

Read `docs/design/DIRECTION.md` first (purpose, principles, palette, type, data display, primitives). Each brief says what the experience should feel like, the hierarchy, the key moments, what to remove and what to keep. Behaviour never changes; presentation does. Each team writes an ADR at `docs/adr/<number>-<slug>.md` (shell 0002, view 0003, manage 0004, stats 0005).

Shared contracts so teams do not collide:
- `LeaderboardTable` (view team) keeps its props `{ leaderboardId, shareCode? }`; the manage team renders it on the edit screen.
- `ConfirmDialog` (manage team) keeps its props and is built on `components/ui/dialog.tsx`; Create and Edit both use it.
- `StatGrid`, `MatchList`, `EloSparkline`, `HeadToHeadTable` (stats team) keep their props (used by both /p and /u).
- The shell owns `app/layout.tsx` (theme bootstrap), the page column and the header; feature screens render inside `<Container>` and must not add their own page-level width or top padding.

---

## shell: App shell, navigation and auth

**Feel.** A quiet frame around the content: the name, three words of navigation, and who you are. It should disappear the moment you are looking at a table. Calm, aligned to one left edge, nothing shouting.

**Hierarchy.** (1) Wordmark "BowlBoard" in `foreground`, semibold, tracking tight, plain text (no gradient), with the tagline in `text-sm text-muted-foreground`; (2) account controls on the right (on a phone they drop below, left-aligned, or collapse to one row); (3) tabs View / Create / Edit as `<Tabs variant="underline">` directly under the header, sharing the content column; (4) content.

**Key moments.**
- First paint in the right theme, no flash: `<ThemeScript />` in `<head>`, no forced `dark`, `suppressHydrationWarning` on `<html>`, `<ThemeToggle />` in the header.
- The Dot Field behind the header is the single decorative element: tone-on-tone (`text-border-strong`), transparent background, compact (`py-8 sm:py-10`), hairline `border-b border-border`. Content sits over it at full contrast.
- Sign in / create account in a `<Dialog>` with `<Field>` + `<Input>`; errors as `<Notice tone="error">` naming the problem ("Username must be 3–20 letters, numbers or underscores"); the primary button reads "Sign in" / "Create account", shows "Please wait…" while loading; Esc and backdrop close it; autofocus on username. Username-only hint ("Use a username, not an email. Example: jayden_w") stays as a hint under the field.
- Signed in: `@username` links to /u/username (label "My stats"), then a `secondary`/`ghost` "Sign out". Signed out: "Sign in" (`secondary`) and "Create account" (`primary`).
- Config banner: a full-width `<Notice tone="warning">` strip above the header (not an amber slab); keep the env var names in `font-mono` code spans.
- 404 (`app/not-found.tsx`): centred `EmptyState`, "We couldn't find that page" with a "Back to BowlBoard" button.

**Remove.** The gradient wordmark, the cyan/violet tab pills, `bg-grid` (now a no-op), `overflow-hidden` page wrapper hacks, cyan/violet borders, forced dark class, glow shadows, `backdrop-blur` on the modal.

**Keep.** All auth behaviour and validation, `getSessionProfile` refresh, tab visibility rule (Edit appears only when the user has boards), config error detection, the Dot Field, the "My stats" link, Esc to close and scroll lock (now native in `Dialog`), `router.refresh()` after auth change.

**Page rhythm.** `<Container>` (768px) for header content, tabs and main; `py-8` main; `space-y-10` between sections inside screens (owned by each screen). One left edge.

---

## view: Viewing leaderboards

**Feel.** The payoff screen: open it and instantly see who is winning. It reads like a printed league table, not a dashboard. Fast to scan on a phone with one thumb.

**Hierarchy.** (1) The leaderboard itself: board name as the page-level title (`text-2xl font-semibold`) with the share code beside or under it (`<ShareCode>`); (2) the table; (3) the way to switch boards or open another by code, which is secondary and sits above the table, compact.

**Key moments.**
- **Board picker**: "my boards + boards I play in" as a single quiet row/list of board names (`<Tabs variant="segmented">` or simple text buttons with `aria-pressed`; selected = ink on `card` with hairline). If more than ~4, a `<Select>` is better on a phone. Do not show share codes on every chip.
- **Open by code**: one line: `<Input>` (mono, uppercase, letter-spaced, `maxLength` 6, placeholder "ABC123") + `<Button variant="secondary">Open</Button>`, label "Open a board with a code". Error under the field via `Field error`. A shared board shows a `<Badge>` "Shared".
- **The table** (`<Table>`): columns `#` (muted), Player (link, `TextLink plain`), W–L (en dash), Win % (hidden on the narrowest screens), ELO (right-most, semibold, the strongest weight). Rank 1 is distinguished only by position (and ink weight), not by colour or a medal. Row hover is a faint `muted` wash; rows are links to the player page (name is the link; do not make the whole row a hit-area that hides the link).
- **Live**: a small `accent` dot (`size-1.5 rounded-full`) and "Live" in `text-xs text-muted-foreground` at the table footer or beside the title, replacing the green uppercase strip. When realtime brings a changed rating, the changed row gets `animate-settle`. Nothing else animates.
- **Loading**: 4 `<Skeleton>` rows shaped like table rows. **Empty board**: `<EmptyState title="No players yet" description="Add players on the Edit tab." />`. **No boards (signed in)**: `<EmptyState>` with a "Create a board" action. **Signed out**: `<Notice tone="info">` ("Sign in to see your boards. You can still open any board with its share code.") above the code input, not an amber alert.

**Remove.** Cyan borders and tints, the tinted "Share code" banner row inside the table, uppercase tracking labels ("YOUR LEADERBOARDS", "SHARE CODE", "LIVE · UPDATES AUTOMATICALLY"), mono numerals, the pulsing "Syncing rankings…" text, the amber warning style for a normal state.

**Keep.** Realtime subscription and reload, `getPlayers`/`getMatches`, `recordsByPlayer`, `formatWinRate`, selecting the first board by default, external board by code, normalisation and validation of the code, links to `/p/[id]`, the share code being visible and copyable (now with a Copy button).

---

## manage: Creating and managing boards

**Feel.** A calm form-and-workbench. Creating a board feels like writing a name on a card; recording a match at the table feels like filling a score sheet: large, obvious, hard to get wrong, with a clear "here is what will happen" moment before anything is committed.

**Hierarchy (Create).** Heading "New board"; a short form (Name, Starting ELO with a hint "New players start here. Default 1000."); one primary button "Create board". Below: "Your boards" as a plain list with rules: name, share code (mono) + copy, starting ELO in muted text, and a quiet `danger` "Delete" button.

**Hierarchy (Edit).** (1) Board selector (`<Select>`, with "Delete board" as a `variant="danger"` ghost button next to it); (2) the leaderboard table as context (reuse `LeaderboardTable`); (3) **Record a match**: the main job of this screen, so it is the first and most prominent block; (4) Add player; (5) Linked accounts. Order sections by frequency of use: record match is used after every game, adding players and linking rarely. A `<Section>` per block, `space-y-10`, no stacked bordered cards.

**Key moments.**
- **Record match** (phone first): two columns from `sm`, one column on phones; each side is Player `<Select size="lg">` + Points `<Input size="lg" inputMode="numeric">` (16px, 48px high). Labels "Player 1"/"Player 2" and "Points" visible above. Field errors from the existing validators appear under their field (`Field error`), red border, no boxed red banners. The primary button is "Preview" (`primary`, `lg`, full-width on phones). Hint under the section title: "Whole numbers; negatives allowed."
- **Preview and confirm**: after Preview, an inline `<Surface>` (the one justified card on this screen) appears below the form with: the result sentence ("Ana 21 – Ben 17"), then one row per player: name, `before → after` rating (tabular), and `<Delta>` large and coloured with sign; the multipliers as a single muted line; then `Confirm` (`primary`, `lg`) and `Edit scores` (`ghost`). Confirming shows "Applying…" (`loading`). No glowing green panel; the colour is in the deltas only. The tie-game message is an inline `Notice tone="info"`.
- **Delete board**: `ConfirmDialog` on `components/ui/dialog.tsx`: title "Delete leaderboard?", body names the board and says it is permanent and removes players and matches; Cancel (`secondary`) and "Delete board" (`destructive`).
- **Add player**: one row of `Field`s: Name, Account username (optional, with hint "Link to an account so this board shows in their stats"); `Add player` secondary or primary-less. Errors inline.
- **Linked accounts**: a rule-separated list; per player: name, `<Badge tone="win">Linked</Badge>` + `Unlink` (`ghost`), or an inline username `Input` + `Link` (`secondary`, `sm`) button. Explanatory sentence once at the top of the section, not per row.

**Remove.** Cyan/violet bordered cards on every section, the boxed red `FieldError` panels, the emerald preview panel and `text-2xl` glowing figures, uppercase section labels, the `select-match` hack (use `size="lg"`), the "Syncing" pulses, `fixed` modal glow.

**Keep.** Every validator and message from `lib/match-scores` and `lib/elo`, preview-before-confirm, tie handling, disabled Preview until two players exist, `disabled` options so the same player cannot be both sides, the live table refresh after add/confirm (`tableKey`), link/unlink with draft state, delete-with-confirm in both Create and Edit, sign-in-required states (`Notice tone="info"`), score sanitising (negatives), starting ELO bounds 100–10000.

---

## stats: Player and profile stats

**Feel.** A player card that has been written up by hand: a name, one big rating, then the record in plain type. It rewards a curious friend ("who beats me most?") without becoming a dashboard. Generous space; each block earns its place.

**Hierarchy (player /p/[id]).** (1) Back link (`TextLink quiet`, "← Board name"); (2) identity: name as the page title (`text-2xl`), with `#3 of 8 on Board name` and `@username` (link to profile) in muted text beneath; (3) **the rating as the one headline figure** (`Stat size="lg"`) next to Record and Win rate in a `StatGroup`; (4) rating history; (5) Activity Terrain; (6) Recent matches; (7) Head to head.

**Hierarchy (profile /u/[username]).** (1) `← BowlBoard`; (2) `@username` page title, meta line ("Plays on 3 leaderboards · joined Oct 2026"); (3) aggregate `StatGroup` (no single rating, since ratings are per board); (4) boards list (name, W–L, win %, rating; each row a link); (5) rating chart for the most active board; (6) Activity Terrain; (7) Recent matches across boards.

**Key moments.**
- **StatGrid**: no boxed cells. A `StatGroup` with a hairline above, label over value, 2 columns on phones and 4 from `sm`. Win/loss streaks colour by result; everything else ink. Streak, best streak, peak, avg score keep their labels. Em dash for no data.
- **Rating history**: a single 1.5–2px line in `foreground` (not accent), no fill, no dots, endpoints labelled with the first/last rating and the min–max range in muted text; `aria-label` kept. Colour is not decoration here: use `win`/`loss` only if you mark the net direction, otherwise ink. Hidden under 2 matches (as now).
- **Activity Terrain**: `className="terrain-theme max-w-none"`, titled by its own header, own `<Section>` "Activity". Player: flat by default (`defaultFlat`), profile: default view.
- **Recent matches**: a rule-separated list (not a bordered card): `W`/`L` mark, "vs Name" (link), board name in muted text when spanning boards, score `21–17` right-aligned, `<Delta>` rating change, short date (hidden on the narrowest). Tabular alignment so scores and deltas form columns.
- **Head to head**: a `<Table>`: Opponent (link), W–L (en dash), Played; sorted as now.
- **Not found** (`app/p/[id]/not-found.tsx` or the global 404 if none exists): `EmptyState` "That player doesn't exist" with a link back home. **Empty states**: no matches yet -> "No matches yet. Record one from the Edit tab." and the chart/terrain sections collapse rather than showing empty frames; a profile on no boards -> "Not on any leaderboard yet. Ask a board owner to link this account."

**Remove.** The boxed `rounded-xl border` wrappers around every block, 1px-gap grid cells with a hard-coded `#050810` background, cyan chart stroke, cyan rating colour, `font-mono` figures, any glow.

**Keep.** Every stat (rating, record, win rate, W/L ratio, streak, best streak, peak, avg score), `rank`/`players.length`, `@username` link to the profile, sparkline `role="img"` and label, Terrain props (`data`, `endDate`, `title`, `unit`, `defaultFlat`), match list limit and sorting, head-to-head, per-board list on profile, SEO metadata functions, `notFound()` behaviour.
