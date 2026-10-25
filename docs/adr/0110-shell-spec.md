# 110. Shell, navigation and auth: design specification

Status: Accepted

## Context

The shell is everything around the three screens: the header with the Dot Field, the tab navigation, the signed-in identity and "My stats" link, the sign in / create account dialog, the config banner, theme handling on `<html>`, the page column and the 404. It is the first thing seen in both usage moments (at the table, and checking rankings later), and it should disappear once a table is on screen.

The incumbent shell is the neon look: a cyan-to-violet gradient wordmark, gradient pill tabs, `bg-slate-*` and `bg-grid` styling, an `overflow-hidden` page wrapper, a forced `dark` class, an amber centred banner, and a hand-built modal (`createPortal`, `backdrop-blur-xl`, a cyan glow shadow, a window `keydown` listener, manual `overflow: hidden` on the body). The code also has defects the redesign should not carry over:

- `AuthModal` calls `setMounted(true)` in an effect (a `react-hooks/set-state-in-effect` lint error), and `AppShell` has the same error on its initial `refreshAuth()` call.
- Selecting the Edit tab and then losing all boards (sign out, deleting the last board) leaves no tab selected and an empty panel.
- Until the first `getSessionProfile()` resolves, signed-in visitors see "Sign in / Create account" and the View screen's signed-out state, then the real state (a flash of wrong content and a second fetch).
- `handleSubmit` has no `try/catch`: a thrown network error leaves the button stuck on "Please wait…".
- Native `required`/`minLength` attributes mean the browser's own bubble pre-empts the app's validation messages.
- "My stats" is hidden on phones, leaving an unlabelled `@username`.

Direction (`docs/design/DIRECTION.md`) and the shell brief (`docs/design/BRIEFS.md`) fix the identity: Scorecard, one 768px column, hairlines, Geist Sans, no gradients/glows/glass, the Dot Field as the single decoration, native `<dialog>` for auth. This ADR records the spec the shell team builds from (`docs/design/features/shell.md`) and the decisions where the brief left room.

## Decision

Spec: `docs/design/features/shell.md` (layout per breakpoint, states, copy, primitives, accessibility, checklist of behaviours that must survive). Key decisions:

**Structure.** Split into focused files, all inside the shell team's ownership:
- `app/layout.tsx`: remove the forced `dark`, add `suppressHydrationWarning`, render `<head><ThemeScript /></head>`. No header in the layout (the stats pages are separate routes with their own mains).
- `components/shell/SiteHeader.tsx` (new): Dot Field + `Container as="header"` + wordmark/tagline + `AuthPanel` + `ThemeToggle`.
- `components/shell/auth-errors.ts` (new): `friendlyAuthError(message, mode)`, a pure mapping from known Supabase messages to plain copy; unknown messages pass through verbatim.
- `components/AppShell.tsx`: state and composition (`ConfigBanner`, `SiteHeader`, `Tabs` + `TabPanel` with `idPrefix="shell"`).
- `components/AuthPanel.tsx`: auth logic kept; UI to `Button`/`TextLink`.
- `components/AuthModal.tsx`: rebuilt on `Dialog` + `Field` + `Input` + `Notice`.
- `components/ConfigBanner.tsx`: `Notice tone="warning"` strip.
- `app/not-found.tsx` (new): centred `EmptyState` and a `buttonVariants` link.

**Header layout.** Brand block (20px semibold wordmark, balanced muted tagline) then an account row; the row wraps under `md` with the theme toggle at its far end, and becomes one line from `md` (768px). The switch is `md`, not `sm`, because the existing tagline plus the signed-in cluster does not fit a 592px column. The Dot Field keeps the exact Director class string, `spacing={16}`, and `py-8 sm:py-10`.

**Signed-in identity.** One link to `/u/username` showing `@username` (Geist Sans, truncating) and a visible "My stats" in muted text; always visible, including on phones. `@username` is no longer mono: Direction reserves mono for the share code.

**Tabs.** `Tabs variant="underline"` labelled View / Create / Edit with `aria-label="Leaderboards"` and `TabPanel`s. The active tab is derived (`edit` without boards falls back to `view`) instead of stored, which removes the empty-panel state without effects.

**Auth loading.** `AppShell` tracks `authReady`. Until it is true, the header shows a `Skeleton` where the account buttons go and the panel shows a 3-row skeleton instead of mounting a screen. The loader uses try/finally so a failed request means "signed out", never a permanent skeleton. The initial load and `refreshAuth` share one async loader that applies state after `await`; the effect must pass `react-hooks/set-state-in-effect` without a disable comment.

**Dialog.** Sign in / Create account use `Dialog size="sm"` with `onSubmit`, portalled to `document.body` through a `useSyncExternalStore` mounted flag (lint-clean, no effect-setState). Reasons for the portal: the dialog would otherwise live inside the Dot Field root, whose native pointer listeners would send ripples through the scrim when someone taps inside the dialog. Because `Dialog` renders its children while closed, React's `autoFocus` would run on a hidden element; Username is focused by a ref in an effect after open instead. `required`/`minLength` are removed in favour of `aria-required`, so the app's own messages appear, in one place, with one voice.

**Error placement (a deliberate reading of the brief).** The brief says errors are `Notice tone="error"`; Direction section 11 says field errors sit under the field. The shell does both, by kind: the two client-side validations (username format, password length) use `Field error` (inline, red border, `aria-invalid`, focus moved to the field); everything that is not about one field (wrong credentials, username taken, rate limit, config, network, profile save) uses `Notice tone="error"` above the buttons. Both name the problem and the fix.

**Small additions that serve the brief's "name the fix" rule, without changing auth behaviour:**
- A mode-switch line under the dialog title ("No account yet? Create one" / "Already have an account? Sign in"), because "wrong credentials" for a new person is otherwise a dead end.
- `try/catch/finally` around submit and sign-out so loading always resets; sign-out gets a `loading` state ("Signing out…").
- Closing the dialog clears errors and the password (the username is kept).

**Config banner.** A full-width strip: wrapper `border-b border-border bg-warn-subtle`, a `Container` inside it, and `Notice tone="warning"` made transparent and square so the strip carries the tint and the text sits on the column's left edge. Env var names stay in `font-mono` spans as the brief says; it is a second, deliberate use of mono (identifiers people copy), in line with the Direction rationale for the share code. The text now names `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the actual variable `lib/env.ts` reads) instead of "your publishable key".

**404.** `app/not-found.tsx` with a centred `EmptyState` and a "Back to Kleos" link built with `buttonVariants()` on `next/link`. Title via metadata "Page not found · Kleos". No header or Dot Field.

**Motion.** None added. Everything animated comes from primitives (tab underline 200ms, dialog 180/120ms, press scale) and the vendor Dot Field.

## Consequences

- The shell becomes light on its own CSS: nearly all styling is primitives and tokens. The grep in Direction section 4 should return nothing for the shell files.
- Screens mount only after the first session check. Signed-out visitors who only want to open a board by code wait for one server round trip before the View screen appears (a skeleton shows meanwhile). This is the same call that happens today; the trade is no wrong-state flash and no duplicate fetch.
- The theme toggle exists only on the home page; `/p` and `/u` have no header. Their theme still follows the stored choice and the system. A shared slim header is a candidate for the Director.
- Known limitations in primitives we may not edit, to raise in review: (a) `ThemeToggle` renders its light-mode icon on the server snapshot, so in dark mode the icon swaps once after hydration; (b) `Dialog` closes on any `click` whose target is the `<dialog>` itself, so a drag that starts in an input and ends on the backdrop closes it; (c) `EmptyState` titles are `<p>`, so the 404 has no heading element.
- `normalizeUsername` silently drops invalid characters (for example `Jayden-W` becomes `jaydenw`), and the form does not show that. Behaviour is unchanged; a live "You'll sign in as jaydenw" hint is a candidate follow-up.
- `AuthModal`'s props change (its only consumer is `AuthPanel`, same team). Screens' props are unchanged.
- Candidate primitives: a full-bleed `Banner`/`NoticeStrip`; a `PasswordField` with show/hide; a shared `SiteHeader` for non-home routes; a fix upstream in `Dialog` to ignore backdrop clicks that started inside the panel.

## Alternatives considered

- **Header in `app/layout.tsx`** so every route shows the toggle and wordmark. Rejected for now: the stats pages own their mains and back links per the briefs, and the Dot Field header adds weight to pages whose subject is one player.
- **Tabs inside the Dot Field header**, with the selected underline sitting on the header rule (one hairline). Appealing, but the brief says directly under the header and the labels would sit on the dot texture, harming the tab text. Kept the two-hairline nav band; Polish may tune the gap.
- **Everything as `Notice`** (literal brief). Loses `aria-invalid`, the red border and focus placement on the offending field.
- **Everything as `Field error`.** Credentials/network errors are not about one field.
- **Keeping native `required`/`minLength`.** Native bubbles are unstyled, un-themed and inconsistent between iOS and desktop.
- **Not gating screens on auth.** Faster first paint for anonymous users, but flashes a wrong state and fetches twice for signed-in users.
- **`createPortal` with an effect-set mounted flag** (the current pattern): fails the project's React Hooks lint rule; `useSyncExternalStore` is the lint-clean equivalent. Skipping the portal is also possible but lets the Dot Field react to taps in the dialog.
- **A shared `next-themes` provider.** Not allowed (no new packages) and unnecessary: `ThemeScript` + `ThemeToggle` already cover it.
- **Hiding "My stats" on phones** (as before) to save width. Rejected: an unlabelled handle is a hidden affordance; truncating the username is cheaper than hiding the label.
