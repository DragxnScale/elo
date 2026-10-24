# BowlBoard visual direction: "Scorecard"

Owner: Design Director. Everything here is binding for the design teams (shell, view, manage, stats). The review will judge every feature against sections 1 and 2.

## 1. Purpose and ethos

BowlBoard is a small, friendly scoreboard for a group of friends. Someone creates a board, shares a 6-character code, adds the people who play, and after every game someone records the score. The app turns that into a live ranking (ELO), and over time into a record of who beats whom.

**Who and when.** A handful of friends, in two moments:

1. **At the table, right after a game.** One person, phone in hand, often in a dim bar, living room or alley, thumbs only, others leaning over the shoulder. They need to pick two players, type two scores (negatives allowed), see what the match will do to both ratings, and confirm. Speed and certainty beat everything: big targets, no ambiguity, no surprises.
2. **Checking the rankings later.** Pull out the phone, open a board by code (or from "my boards"), glance at the table, maybe tap a name to see their streak, peak rating, head to head and heatmap. This is the part friends talk about, so it should be a pleasure to read.

**What it should feel like.** A pencil-and-paper scorecard that happens to be live. Calm, confident, a little warm, never loud. The numbers are the content; the interface is the paper they are written on. It should feel the same quality as a well-made notes or finance app, not a gaming dashboard.

**What it is not.** Not neon, not "futuristic", not glassy, not a gamified esports UI. No gradients, glows, uppercase tracking-wide labels, or decorative icons. (This replaces the previous cyan/violet look entirely.)

**Mode** (Impeccable): *Operate*. Familiarity and scanability beat expression. Brand lives in precise details: type, spacing, one considered palette, a handful of well-made moments.

## 2. Principles

1. **Paper and ink.** Warm off-white (or warm charcoal) surface, near-black ink text, hairline rules. Structure comes from spacing and thin lines, not boxes.
2. **Colour means something.** Neutrals do 95% of the work. Colour appears only to say: win / rating up (green), loss / rating down (red), current or focusable (ballpoint blue), caution (amber). Never decorative, never colour alone (always a sign, letter or label too).
3. **Numbers are the hero.** Ratings, records and scores get tabular figures, consistent alignment, and the most visual weight on every screen.
4. **One main action per surface.** One solid ink button. Everything else is outlined or quiet.
5. **Restraint is the ornament.** Fewer elements, more space. If removing something loses no information or affordance, remove it. The Dot Field in the header is the single piece of atmosphere in the product.
6. **Thumb first.** Design for a phone held in one hand under bad light: 40px minimum controls (48px for the record-match flow), 16px inputs on mobile, strong contrast in both themes.
7. **Motion confirms, never performs.** Short, ease-out, from a visible state. Nothing animates on page load.

## 3. Theme strategy (light and dark)

Both themes are first-class; **follow the system by default**, allow an explicit override.

- Scene argument: the table moment is often evening and dim (dark wins there); the lookup moment is anywhere, often daylight on a phone (light wins there). No single theme is right, so we do not force one. The previous forced `dark` class is removed.
- Dark mode is the `.dark` class on `<html>` (Tailwind variant: `@custom-variant dark (&:where(.dark, .dark *))`, unchanged).
- Implementation (no package needed), **the shell team must do this in `app/layout.tsx`**:
  1. Remove the hard-coded `dark` from the `<html>` className.
  2. Add `suppressHydrationWarning` to `<html>`.
  3. Render `<head><ThemeScript /></head>` (`import { ThemeScript } from "@/components/ui/theme-script"`). It sets `.dark` and `color-scheme` before first paint from `localStorage["bowlboard-theme"]` (`"light"` | `"dark"`) or the system preference, and follows system changes while no explicit choice is stored.
  4. Put `<ThemeToggle />` (`@/components/ui/theme-toggle`) in the header, next to the account controls. It is an icon button; the label is "Switch to dark theme" / "Switch to light theme".
- Do **not** use `dark:` variants in feature code for colours that tokens already cover. `bg-background text-foreground` flips by itself. `dark:` is only for rare exceptions.
- The `meta` theme colour is not needed.

## 4. Palette

Defined in `app/globals.css` as CSS variables on `:root` (light) and `.dark`, exposed to Tailwind through `@theme inline`, so `bg-background`, `text-muted-foreground`, `border-border`, etc. work. oklch is the source of truth; hex is for reference and for canvas components that parse hex only.

| Token (Tailwind class) | Light oklch | Light hex | Dark oklch | Dark hex | Use |
|---|---|---|---|---|---|
| `background` | 0.985 0.004 85 | #fbfaf7 | 0.175 0.006 70 | #12100e | Page ("paper") |
| `card` | 1 0 0 | #ffffff | 0.215 0.007 70 | #1c1916 | Raised: inputs, dialogs, Surface |
| `muted` | 0.962 0.006 85 | #f4f2ee | 0.235 0.008 70 | #211d1a | Wells, hover rows, skeletons, segmented track |
| `foreground` | 0.21 0.012 70 | #1c1712 | 0.945 0.005 85 | #eeede9 | Ink: primary text, primary button fill |
| `muted-foreground` | 0.47 0.012 75 | #5f5a54 | 0.71 0.01 78 | #a5a19b | Secondary text, labels, placeholders (6.5:1 / 7.4:1 on background) |
| `border` | 0.915 0.007 85 | #e5e3de | 0.29 0.009 70 | #2e2b27 | Hairlines, row dividers, card edges |
| `border-strong` | 0.84 0.009 85 | #cdcac4 | 0.38 0.01 70 | #46423d | Table header rule, Dot Field dots, link underlines |
| `input` | 0.64 0.01 80 | #8f8c85 | 0.52 0.01 70 | #6d6863 | Control borders (>=3:1, WCAG 1.4.11) |
| `primary` / `primary-foreground` | = foreground / = background | #1c1712 / #fbfaf7 | = foreground / = background | #eeede9 / #12100e | The main button |
| `accent` | 0.46 0.17 264 | #244eb5 | 0.76 0.12 264 | #8ab0fe | Ballpoint blue: focus ring, selected-tab underline, live dot, "now" |
| `accent-subtle` | 0.95 0.025 264 | #e6efff | 0.27 0.05 264 | #1a263f | Selection tint, row "settle" flash |
| `win` / `win-subtle` | 0.5 0.13 152 / 0.955 0.035 152 | #05773b / #e0f7e5 | 0.78 0.15 152 / 0.26 0.05 152 | #62d286 / #0e2b18 | Win, rating up, success |
| `loss` / `loss-subtle` (`destructive`) | 0.52 0.18 27 / 0.955 0.03 27 | #ba2b28 / #ffe9e5 | 0.75 0.15 25 / 0.27 0.06 25 | #ff847d / #3f1917 | Loss, rating down, errors, delete |
| `warn` / `warn-subtle` | 0.5 0.11 70 / 0.96 0.04 85 | #8a5600 / #fef0d4 | 0.8 0.12 80 / 0.27 0.05 80 | #e6b55d / #332305 | Config and sign-in guidance only |
| `ring` | = accent | | = accent | | Focus outline |
| `scrim` | 0.2 0.01 70 / 38% | | 0.08 0.005 70 / 62% | | Dialog backdrop |

Measured contrast (WCAG): foreground on background 17.0:1 light / 16.2:1 dark; muted-foreground 6.5 / 7.4; accent text 7.1 / 8.8; win on its subtle fill 5.0 / 8.1; loss on its subtle fill 5.2 / 6.5; control border `input` vs card 3.4 / 3.2.

Rules:
- Text is `foreground` or `muted-foreground`. Two levels, no third grey. Placeholder text is `muted-foreground`.
- Rating up/down and win/loss share the same two colours; the **sign** (+ / −) or the **letter** (W / L) always accompanies colour.
- `accent` marks what is *current or focusable*. It is never a button fill and never decoration.
- Tints (`*-subtle`) are for Notice, Badge and the settle flash, with foreground text on top, never coloured text on a coloured fill beyond what the tokens pair.
- Do not use Tailwind's raw palette (`slate-*`, `cyan-*`, `violet-*`, `emerald-*`, `red-*`, `amber-*`, `zinc-*`, `bg-[#...]`, `shadow-[...rgba...]`) in feature code. Migration check (should return nothing when done): `grep -rnE "(slate|cyan|violet|emerald|red|amber|zinc|gray|neutral)-[0-9]|bg-\[#|input-futuristic|btn-primary|btn-secondary|select-match|bg-grid" app components --include=*.tsx --exclude-dir=kokonutui`.

## 5. Typography

One family. Geist Sans (already loaded as `--font-geist-sans`) carries headings, labels, body and data. Geist Mono (`font-mono`) is used for **one thing only: the share code**, an identifier people read aloud and retype. Ratings and scores are Geist Sans with tabular figures, not mono.

Fixed rem scale (product UI, not fluid), Tailwind defaults:

| Role | Class | Size / weight | Where |
|---|---|---|---|
| Page title | `text-2xl font-semibold tracking-tight` | 24 | Player name, @username, board name in view |
| Headline figure | `text-3xl font-semibold tabular-nums` (`<Stat size="lg">`) | 30 | The one rating per page |
| Section title | `text-base font-semibold` (`<Section>`) | 16 | "Recent matches", "Record a match" |
| Dialog title | `text-lg font-semibold` | 18 | |
| Body, controls, table cells | `text-sm` (14), inputs `text-base sm:text-sm` | 14 / 16 on phone inputs | Default (set on `body`) |
| Stat value | `text-xl font-semibold tabular-nums` | 20 | `<Stat>` |
| Label, meta, table header | `text-sm text-muted-foreground`, table head `text-xs font-medium` | 14 / 12 | |

Rules: sentence case everywhere (no `uppercase`, no `tracking-widest` labels, no eyebrows above headings). Headings `text-wrap: balance`, tracking -0.015em (set globally on h1-h3). Prose measure <= 65ch (`max-w-prose`). Weights: 400 body, 500 labels and buttons, 600 headings and figures; no bold 700.

## 6. Data display

- **Tabular numerals everywhere data lives.** `table`, `dl`, `time` are tabular by default (globals); add `tabular-nums` on any other number.
- **Rating (ELO):** plain integer, ink, `font-semibold` in the leaderboard (the right-most column, the eye's landing spot). No "ELO" suffix in tables (the column header says it); in prose and previews write "1,042 ELO" once.
- **Record:** `12–4` with an **en dash** (U+2013) via `formatRecord(w, l)`. Never a hyphen. Win rate `67%`, no decimals; `—` for none.
- **Rating change:** `+12` green, `−8` red (a true minus U+2212, not a hyphen), `0` muted, via `<Delta>` / `formatSigned()`. In the preview, show before → after: `1,000 → 1,012` with the delta beside it.
- **Streak:** `W3` / `L2`, coloured by result, with the full phrase in the label ("Current streak").
- **Scores:** `21–17`, `-3–10` (a negative score keeps its minus; separate with the en dash and spaces if confusing: `-3 – 10`). Tabular, right-aligned in rows.
- **Results:** `W` / `L` letters (`<ResultMark>`), semibold, coloured, with accessible Win/Loss labels.
- **Rank:** plain number, `muted-foreground`, left column; no medals, no glyph icons. The leader may be marked by position alone.
- **Alignment:** numbers right-aligned in columns (`numeric` prop on table cells); text left-aligned; headers match their column.
- **Empty value:** an em dash `—`, muted. Never "N/A" or "0%" for "no data".
- **Dates:** `Oct 24` (short month, day), `<time dateTime>`, muted.
- **Share code:** `<ShareCode code>`: mono, uppercase, letter-spaced 0.18em, with a Copy action.

## 7. Spacing, layout, radius, elevation

- **Base unit 4px**, Tailwind spacing scale. Group tightly, separate generously: inside a group `gap-2`/`gap-3`; label to control `gap-1.5`; between fields `space-y-4`; between sections `space-y-10` (40px); page top padding `py-8` (mobile) / `py-12`.
- **One column**: `<Container>` (max-w-3xl = 768px, 16px gutters on phones, 24px from `sm`). Everything aligns to its left edge: header wordmark, tabs, section titles, table. Do not center-align content blocks; empty states and the 404 are the only centred text.
- **Radius**: `rounded-md` (6px) controls and buttons; `rounded-lg` (8px) Surface; `rounded-xl` (12px) dialogs and the Activity Terrain card; `rounded-sm` (4px) badges; `rounded-full` only for the live dot.
- **Elevation**: flat. Hairline `border-border` is the structure. The only shadow in the product is `shadow-overlay` on dialogs (soft, offset, two layers). No glows, no coloured shadows, no gradients, no glass. Backdrop blur is not used (the scrim is enough).
- **Surfaces**: reserve `<Surface>` (bordered card) for a form being filled in, the match preview that needs confirmation, and similar. Never nest. Lists and tables use rules (`border-b`) and whitespace.

## 8. Motion

Tokens: `ease-out` is overridden to a strong curve `cubic-bezier(0.23, 1, 0.32, 1)`; `ease-in-out` to `cubic-bezier(0.77, 0, 0.175, 1)`. Never `ease-in`.

| Thing | Duration | Notes |
|---|---|---|
| Hover / colour / border | 150ms `ease-out` | `transition-colors duration-150`; never `transition-all` |
| Button press | `scale(0.98)` | built into Button, `motion-safe` only |
| Tab underline | 200ms `ease-out` | scaleX from the left |
| Dialog | 180ms in, 120ms out | opacity + 6px rise + scale .98 -> 1, centred (CSS in globals `.ui-dialog`) |
| Settle (live row update) | 1400ms | `animate-settle`: row tint fades from `accent-subtle` to transparent. The one authored moment: use it when a leaderboard row's rating changes in realtime |

Rules: animate `opacity`, `transform`/`scale`, and colours only. Nothing animates on page load or tab switch. Nothing animates on keyboard actions. Under 200ms for anything the user triggers. `prefers-reduced-motion`: animations collapse to instant, press-scale is off (globals + `motion-safe:`), the dialog loses its transform and keeps its fade. Hover styles apply only on hover-capable devices (Tailwind v4 default).

## 9. Browser surfaces (themed, not defaulted)

`::selection` is an accent tint; the caret is `accent`; `:focus-visible` is a 2px `ring` outline with 2px offset on everything (inputs get a border + 3px soft ring instead); scrollbars are thin and `border-strong`; `color-scheme` follows the theme so native controls, date pickers and scrollbars match; tap highlight is off and `touch-action: manipulation` removes the 300ms delay; `body` scroll locks while a dialog is open; underlines use `underline-offset: 4px`.

## 10. Kokonut components

**Dot Field** (header backdrop). It draws dots in the element's computed `color` and reads it every 500ms, so it follows theme changes. Treat it as ambient texture, not content:
- `className="min-h-0 items-stretch bg-transparent text-border-strong dark:bg-transparent dark:text-border-strong border-b border-border"` (the vendor default sets `bg-white/zinc` and a 560px min-height; `cn()` resolves the conflicts as tested).
- `spacing={16}` (quiet), keep `interactive` default (swipe/click ripples are a nice discovery but invisible at rest).
- Header content sits above it with the wordmark in `text-foreground`. Keep the header compact (`py-8 sm:py-10`), not a hero.
- Never put a gradient or colour wash over it.

**Activity Terrain** (heatmap). It reads `--terrain-0..4`, `--terrain-accent`, `--terrain-text` as **hex** from its own element. Add the class **`terrain-theme`** (defined in globals): it re-points those variables at the Scorecard ramp (`--heat-*`, light and dark) and recolours the vendor's zinc chrome (toggle, legend, border, background, radius) without editing vendor code.
- Usage: `<ActivityTerrain ... className="terrain-theme max-w-none" />`. The ramp is warm greys from `muted` to ink; the highlighted day is accent blue.
- Place it as its own titled `<Section title="Activity">`, full column width, no extra Surface around it (it brings its own border). Keep it below the stats and the rating chart; it is a reward, not the lead.
- Player page defaults to the flat view (`defaultFlat`); keep that.

## 11. Component usage rules

- Use `components/ui` primitives. Do not use the deprecated global classes (`.input-futuristic`, `.btn-primary`, `.btn-secondary`, `.select-match`, `.bg-grid`); they remain only so unmigrated code still renders.
- One `variant="primary"` button per surface. Cancel is `secondary`. The trigger that *opens* a destructive flow is `variant="danger"` (quiet red text); the confirm button inside the dialog is `variant="destructive"` (solid red), the only solid red in the app.
- Forms: `<Field label hint error>` + `<Input>`/`<Select>`. Labels are always visible (no placeholder-as-label). Placeholders show an example, not an instruction. Errors name the problem and the way out ("Enter a whole number, like 21 or -3"), sit under the field in `text-loss`, and the control gets a red border via `invalid`/Field.
- Form-level or page-level messages: `<Notice tone>`. Signed-out guidance is `tone="info"` (not amber), config problems `tone="warning"`, failures `tone="error"`.
- Modals only for auth and destructive confirms (`<Dialog>`). Everything else is inline.
- Loading: `<Skeleton>` shaped like the content (3 table rows), never a centred "Loading…" spinner. Empty: `<EmptyState>` that says what to do next, with the action.
- Links: `<TextLink>`; names in tables use `variant="plain"`, back links `variant="quiet"`.
- Icons: `lucide-react`, 16px (`size-4`), stroke default, always `aria-hidden` with visible or aria text beside. Icons only where they clarify (copy, theme, chevrons, notice tone). No decorative icons, no emoji, no glyph arrows as icons (use `→` only in prose like "1,000 → 1,012").
- No gradients. No `uppercase tracking-*` labels. No coloured `border-l`. No glow. No nested cards. No `transition-all`.

## 12. Primitives (`components/ui/*`, import per file, e.g. `@/components/ui/button`)

| Export (file) | When to use |
|---|---|
| `Button`, `buttonVariants` (`button.tsx`) | Every action. Variants `primary` (ink, one per surface), `secondary` (outlined), `ghost` (toolbars, copy), `danger` (quiet red trigger), `destructive` (solid red confirm), `link` (inline). Sizes `sm` 32, `md` 40, `lg` 48 (record-match flow), `icon`. `loading` disables and sets `aria-busy`; change the label yourself. **`type` defaults to `"button"`; pass `type="submit"` on submit buttons.** `buttonVariants()` styles a `<Link>` as a button. |
| `Input`, `controlClasses` (`input.tsx`) | Text/number inputs. `size="lg"` for score entry. `invalid` sets `aria-invalid` and the red border. |
| `Select` (`select.tsx`) | Native select with chevron (best phone picker). Same props as Input; `className` styles the wrapper. |
| `Field` (`field.tsx`) | Label + control + hint + error with correct ids/aria. Pass the control as the child element (ids injected) or a function `(control) => <Input {...control} />`. `optional` adds "(optional)"; `hideLabel` for the share-code input if the design hides its label. |
| `Notice` (`notice.tsx`) | Inline message: `info`, `success`, `warning`, `error`. Errors are `role="alert"`. |
| `Surface` (`surface.tsx`) | Bordered container, padding `none/sm/md/lg`. Rarely. |
| `Section` (`section.tsx`) | Titled page block (heading, optional description, optional right `action`). `as="h3"` when nested. |
| `Container` (`container.tsx`) | The one page column (`narrow`, `default`, `wide`); `as="main" | "header" | ...`. |
| `Tabs`, `TabPanel`, `tabId`, `panelId` (`tabs.tsx`) | `variant="underline"` for View / Create / Edit; `"segmented"` for small inline choices (e.g. Flat/Terrain-like toggles, board filter). Keyboard: arrows, Home, End. |
| `Dialog` (`dialog.tsx`) | Auth and destructive confirms on native `<dialog>`. Controlled `open`/`onClose`; `title`, `description`, `footer`; `onSubmit` wraps content in a `<form>` (sign-in). |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (`table.tsx`) | Leaderboard, head to head. `numeric` right-aligns and tabularises a column (set on head and cells). Scrolls horizontally if narrow. |
| `Stat`, `StatGroup`, `Delta`, `ResultMark` (`stat.tsx`) | `StatGroup` (`<dl>`, 2 cols on phone, `columns` from sm) of `Stat`s; `Stat size="lg"` for the one headline rating; `Delta` for +/− changes; `ResultMark` for W/L. |
| `Badge` (`badge.tsx`) | Tiny status label: "Linked", "Shared". Tones `neutral/accent/win/loss/warn`. |
| `Skeleton` (`skeleton.tsx`) | Loading placeholders sized like the content. |
| `EmptyState` (`empty-state.tsx`) | Nothing-here states that point to the next step. |
| `TextLink` (`link.tsx`) | Links (wraps `next/link`): `inline`, `quiet`, `plain`. |
| `CopyButton` (`copy-button.tsx`), `ShareCode` (`share-code.tsx`) | Share code display with copy-to-clipboard feedback. |
| `ThemeScript`, `THEME_STORAGE_KEY` (`theme-script.tsx`), `ThemeToggle` (`theme-toggle.tsx`) | Theme bootstrap for `<head>` and the header switch. Shell team only. |
| `cn`, `formatSigned`, `formatRecord` (`lib/utils.ts`) | Class merging; `+12` / `−8`; `12–4`. |

Utility classes from globals: `animate-settle` (row update flash), `terrain-theme` (Activity Terrain bridge), `shadow-overlay`.

## 13. Do / Don't

| Do | Don't |
|---|---|
| Let whitespace and a hairline separate sections | Wrap every section in a bordered, tinted card |
| One solid ink button per surface | Gradient buttons, glow shadows, two competing primaries |
| Show `+12` green / `−8` red with the sign | Colour alone, or `-8` with a hyphen |
| `12–4` with an en dash, tabular figures | Mono-spaced "tech" numbers, `12-4` |
| Sentence-case labels, `text-sm text-muted-foreground` | `uppercase tracking-widest` micro-labels and eyebrows |
| Tokens (`bg-card`, `text-loss`, `border-border`) | `slate-*`, `cyan-*`, `bg-[#0a0f1a]`, `dark:` colour pairs |
| Skeleton rows while loading; empty states with a next step | A centred "Syncing…" pulse; "No data" |
| Native `<dialog>` for auth and delete | Custom modal with blur and glow |
| Short ease-out colour/opacity transitions | `transition-all`, entrance animations, ease-in |
| Name the problem and the fix in errors | "Something went wrong" / raw backend strings without context |
| 16px inputs on phones, 48px record-match controls | Tiny tap targets, `text-sm` inputs that trigger iOS zoom |
