# 1. Visual direction: "Scorecard" (minimal, paper and ink)

Status: Accepted

## Context

Kleos is a small ELO leaderboard app for groups of friends. People use it in two moments: on a phone at the table right after a game (pick two players, type two scores, preview the rating change, confirm), and later to check the rankings and each other's stats. Both are quick, usually one-handed, often in dim light.

The existing UI was a neon "futuristic" look: a slate-950 background forced on with `class="dark"`, cyan and violet gradients, glows (`shadow-[0_0_40px_rgba(34,211,238,...)]`), gradient text, uppercase tracking-wide labels and mono numerals everywhere, bordered cards around every section, and styles split between a few global classes (`.input-futuristic`, `.btn-primary`, `.btn-secondary`, `.select-match`, `.bg-grid`) and raw Tailwind palette classes in every component. There were no shared primitives, no tokens, no light theme, and several accessibility gaps (labels not tied to inputs, placeholder-only hints, 40-ish px targets, low-contrast slate-500 on slate-950 for meta text).

The user asked for a **minimalistic** redesign: restraint, typography and spacing over decoration. Four feature teams (shell, view, manage, stats) will redesign in parallel, so they need a shared, binding foundation they cannot disagree about: tokens, primitives, and written rules. Kokonut's Dot Field and Activity Terrain must stay and fit the new look.

## Decision

Adopt a single identity, **Scorecard**: warm paper, pencil-dark ink, hairline rules, one ballpoint-blue accent, and colour reserved for meaning. Mode is Operate (a tool used in a task), so familiarity and scanability outrank expression.

**Tokens (`app/globals.css`).**
- Semantic CSS variables on `:root` (light) and `.dark`, exposed through `@theme inline` so Tailwind classes `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-border-strong`, `border-input`, `bg-primary`, `text-accent`, `text-win`, `text-loss`, `bg-*-subtle`, `shadow-overlay` exist. Values are oklch; contrast was calculated, not eyeballed (ink 17:1, secondary text 6.5:1 light / 7.4:1 dark, control borders >=3:1, semantic colours 5:1+ on their tinted fills).
- Neutrals are slightly warm (hue 70-85, chroma < 0.012). Light = paper `#fbfaf7`; dark = warm charcoal `#12100e`, not blue-black.
- Semantic colours: green for win and rating up, red for loss and rating down (also errors/delete), ballpoint blue `#244eb5` / `#8ab0fe` for what is current or focusable, amber for caution. Win/loss are never conveyed by colour alone (sign, letter, label).
- Radius 4/6/8/12px; flat elevation with a single overlay shadow; `ease-out` redefined as `cubic-bezier(0.23, 1, 0.32, 1)`, `ease-in-out` as `cubic-bezier(0.77, 0, 0.175, 1)`; a `settle` keyframe (`animate-settle`) as the one authored motion (a leaderboard row whose rating just changed fades from a blue tint).
- Base layer themes the browser surfaces: selection, caret, focus-visible outline, thin scrollbars, `color-scheme`, tap highlight, tabular numerals on `table`/`dl`/`time`, balanced headings, scroll lock under `dialog[open]`, reduced-motion.
- Native `<dialog>` enter/exit animation lives in `@layer components` (`.ui-dialog`, 180ms in / 120ms out, via `@starting-style` and `allow-discrete`).
- `--heat-0..4`, `--heat-accent`, `--heat-text` (hex, because Activity Terrain parses hex only) and a `.terrain-theme` class that re-points the vendor's `--terrain-*` variables, border, background and zinc chrome at them. It uses `!important` on purpose: the vendor sets the same custom properties on the same element via Tailwind classes, and we may not edit `components/kokonutui/**`.
- Legacy classes (`.input-futuristic`, `.btn-primary`, `.btn-secondary`, `.select-match`, `.bg-grid`) are kept but restyled to the new tokens (`.bg-grid` becomes a no-op) and marked deprecated in comments, so unmigrated components do not render broken while four teams work at once. `DIRECTION.md` includes a grep that proves the migration is finished.

**Theme strategy.** Light and dark are both first-class; the default follows the system, and an explicit choice is stored in `localStorage["bowlboard-theme"]`. The previous forced `dark` is removed. Reasoning from the use scene: the table moment is often evening and dim, the look-up moment often daylight on a phone, so neither theme can be right alone. `ThemeScript` (server component, inline script in `<head>`, before first paint) and `ThemeToggle` (client, `useSyncExternalStore` over the `.dark` class) are delivered; the shell team wires them into `app/layout.tsx` (remove `dark` from `<html>`, add `suppressHydrationWarning`).

**Typography.** Keep Geist Sans for everything and Geist Mono only for the share code. Ratings and scores are Geist Sans with tabular figures (not mono), which reads as typography rather than "terminal". Fixed rem scale (Tailwind defaults), body 14px, inputs 16px on phones (prevents iOS zoom), weights 400/500/600, sentence case, no uppercase tracking labels, no eyebrows.

**Layout.** One column, `max-w-3xl`, 16px gutters on phones and 24px from `sm`, a shared left edge, 40px between sections. Structure comes from whitespace and hairlines; a bordered Surface is reserved for forms being filled and the match preview, never nested.

**Primitives (`components/ui/*`, all typed, `focus-visible`-aware, lint-clean).** `button` (variants primary/secondary/ghost/danger/destructive/link, sizes sm/md/lg/icon, `buttonVariants()` for links, press scale under `motion-safe`, `type="button"` by default), `input` and `select` (native select with chevron, `aria-invalid` drives the error style, `size="lg"` for score entry), `field` (label, hint, live error region, ids and `aria-describedby` wired automatically), `notice` (info/success/warning/error, `role` by severity), `surface`, `section`, `container`, `tabs` (WAI-ARIA, roving tabindex, arrows/Home/End, underline and segmented variants, `TabPanel`), `dialog` (native `<dialog>`: focus trap, inert background, Esc, focus return for free), `table` (with a `numeric` column prop), `stat` (`StatGroup`, `Stat`, `Delta`, `ResultMark`), `badge`, `skeleton`, `empty-state`, `link` (`TextLink`), `copy-button` and `share-code`, `theme-script` and `theme-toggle`. `lib/utils.ts` gains `formatSigned` (`+12`, `−8` with a true minus) and `formatRecord` (`12–4` with an en dash) so data formatting is consistent across teams.

**Kokonut.** Dot Field becomes ambient, tone-on-tone texture: transparent background, `text-border-strong`, compact header, no overlay. It is the only decoration in the product. Activity Terrain gets the `terrain-theme` class and a warm-grey ramp with a blue highlight day; it sits in its own titled section below the stats, never as the lead.

**Dependency.** One package added: `lucide-react` (`^1.61.0`). Justification: `components.json` already declares `iconLibrary: "lucide"`, so this is the project's intended icon set, not a new choice; the identity needs only ~8 glyphs (chevron, copy, check, sun, moon, and notice tone icons) and the rule is that icons are drawn from one consistent stroke family, not emoji or unicode glyphs. It is imported by name per icon, so it tree-shakes to those icons. No theme package (`next-themes`) was added because a 10-line inline script plus `useSyncExternalStore` covers the need without a dependency or the React 19 script-tag warning. No `class-variance-authority`, no Radix: variants are a plain object map and `<dialog>`/native `<select>` cover the accessible behaviour.

**Documentation.** `docs/design/DIRECTION.md` (purpose and ethos, principles, theme strategy, palette with hex and oklch, type scale, data-display rules, spacing, motion, Kokonut rules, usage rules, primitives table, do/don't) and `docs/design/BRIEFS.md` (one brief per feature plus cross-team contracts).

**Verification done.** `npx eslint components/ui lib/utils.ts` is clean; `tsc` reports no errors in the owned files; `app/globals.css` was compiled with the project's Tailwind v4 PostCSS plugin and all token utilities, the dialog rules and `@theme` output were confirmed; `cn()` was checked to resolve the vendor class conflicts (e.g. `bg-white` -> `bg-transparent`, `text-zinc-900` -> `text-border-strong`, `border-zinc-200` -> `border-border`); contrast ratios were computed from the oklch values. I could not render the app in a browser (no browser in this environment and `next dev`/`build` are forbidden while teams share `.next`), so the look has not been verified visually; the review should check screenshots once the teams land their work.

## Consequences

- Teams get a shared vocabulary and can migrate in any order; unmigrated components still render (restyled legacy classes, default Tailwind palette still available) but will look inconsistent until moved. Raw palette classes are not enforced by tooling; the grep in `DIRECTION.md` is the check.
- Light theme is new and must be reviewed on every screen, not only dark. Terrain and Dot Field follow the theme (Dot Field polls `color` every 500ms; Terrain observes the `class` attribute).
- `Button` defaults to `type="button"`; any `<button type="submit">` replaced by `Button` must say `type="submit"`, otherwise a form silently stops submitting. Documented in the primitives table.
- `.terrain-theme` uses `!important` and attribute selectors for the vendor's zinc utility classes; if Kokonut changes its markup the bridge degrades to zinc chrome (still legible) rather than breaking.
- `Dialog` relies on native `<dialog>` and CSS `allow-discrete`/`@starting-style` (Chrome 117+, Safari 17.4+, Firefox 129+); older browsers get the same dialog without the animation.
- A new dependency (`lucide-react`) is in `package.json`; it only affects client bundles that import icons.
- Removing gradients, glow, uppercase labels and card boxes makes the UI quieter; the cost is less "wow" and more reliance on type and spacing quality. That is the intent.
- The `settle` row flash and any ambient Dot Field motion are the only non-interaction motion; anything beyond that is out of direction.

## Alternatives considered

1. **Polish the neon look** (tone down the glow, keep cyan/violet). Rejected: the brief is a replacement, and the neon palette fails the use scene (low-contrast greys on near-black, a single forced theme) and leans on the effects the direction bans.
2. **Pure black-and-white monochrome with no accent.** Cleaner still, but loses a way to mark "current" and focus that is not red/green; a single restrained blue costs little and the focus ring needs a colour that is not a result colour.
3. **Dark only.** The previous choice. Rejected: daylight phone use is half the use; dark-only also fights the minimal editorial direction. We keep dark as a first-class theme and make the system the default.
4. **A saturated brand accent (bowling-lane amber, pin red).** Amber collides with warnings and red with losses, which would blur the one rule that colour carries meaning.
5. **Geist Mono for all numbers.** Rejected: reads as "technical costume"; Geist Sans has tabular figures and keeps ratings visually calm. Mono is kept for the share code, which is an identifier people retype.
6. **shadcn/ui via the CLI.** Not possible (ui.shadcn.com is blocked) and it would pull in Radix and class-variance-authority for little gain; the primitives are small and hand-written against the same token names (`background`, `foreground`, `muted`, `border`, `ring`), so a later shadcn migration stays easy.
7. **`next-themes`.** Works, but adds a dependency and a known React 19 `<script>` warning for something an inline script does in a few lines.
8. **Reset Tailwind's default palette (`--color-*: initial`) to enforce tokens.** It would stop teams using `slate-*`/`cyan-*`, but it would break every unmigrated file mid-edit while four teams work in parallel. Revisit once the migration grep is clean.
9. **Custom modal with Radix-style focus management.** Replaced by native `<dialog>`, which gives focus trapping, inert background, Esc, and focus return with no code or dependency.
