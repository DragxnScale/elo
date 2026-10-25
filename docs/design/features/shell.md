# Feature spec: App shell, navigation and auth

Owner: Shell Feature Lead. Binding for the shell Builder and Polish designer. Read `docs/design/DIRECTION.md` and the shell brief in `docs/design/BRIEFS.md` first; this document turns them into build instructions and does not repeat them.

Files owned by this team: `app/layout.tsx`, `app/page.tsx`, `app/not-found.tsx` (new), `components/AppShell.tsx`, `components/AuthPanel.tsx`, `components/AuthModal.tsx`, `components/ConfigBanner.tsx`, and new files under `components/shell/`.

## 1. User goals

1. **Get to the table fast.** Someone arrives (often one-handed, in a dim room) wanting the View tab for a board, or the Edit tab to record a match. The frame must not get in the way: three words of navigation, reachable with a thumb.
2. **Know who I am and whether I'm signed in.** Signed in: see `@username`, reach my stats, sign out. Signed out: sign in or create an account without leaving the page.
3. **Pick a theme once and have it stick.** Follow the system by default (dim bar vs daylight), allow an explicit override, never flash the wrong theme on load.
4. **Understand a broken setup.** If Supabase is not configured, say so plainly, at the top, with the variable names to fix.
5. **Recover from a wrong URL.** A 404 explains and offers one way home.

Mode: Operate. Familiarity (tabs, a normal sign-in dialog) beats expression. The only atmosphere is the Dot Field.

## 2. Information hierarchy (top to bottom, one left edge)

1. Config strip (only when misconfigured), full width.
2. Header over the Dot Field: **wordmark** "Kleos" (foreground, semibold, plain text) with the muted tagline; then the **account row** (identity or Sign in / Create account) with the theme toggle at its far end.
3. **Tabs** (underline): View / Create / Edit (Edit only when the user has boards).
4. **Content** of the active tab, rendered by the feature screens inside the same column.

Everything aligns to the left edge of the 768px `Container`: wordmark, tagline, account controls, the first tab label, and screen content.

## 3. Layout per breakpoint (phone first)

Column: `Container` (max 768px, 16px gutters under `sm`, 24px from `sm`).

### Phone (< 768px)

```
[ config strip, only if misconfigured ]
.................dot field.................
 Kleos
 [Sign in] [Create account]            (sun)
.............................................   <- border-b border-border
 View    Create    Edit                          <- Tabs underline, 44px tall
---------------------------------------------   <- tablist hairline
 (screen content, pt-8)
```

- Header container: `relative py-8 sm:py-10`, a flex column with `gap-5`.
- Brand block: `h1` wordmark `text-xl font-semibold tracking-tight text-foreground`; tagline `text-sm text-muted-foreground text-balance` (wraps to two lines on a 360px phone; balance avoids a one-word orphan).
- Account row: `flex flex-wrap items-center gap-2`; the `ThemeToggle` takes `ml-auto` so it sits at the right edge of the row. Wrapping is allowed so a 20-character username never overflows; nothing scrolls horizontally.
- Signed out row: `Sign in` (secondary, md) and `Create account` (primary, md). Roughly 230px wide, fits at 320px with the toggle.
- Signed in row: identity link (see section 5), `Sign out` (ghost, md), toggle at the end.
- Targets: every control is at least 40px high (Button md, Tabs 44, toggle 40).

### From `md` (>= 768px)

One header row: brand left, account cluster right (`md:flex-row md:items-center md:justify-between`). The cluster is `shrink-0`; the brand block is `min-w-0`, so the tagline wraps before anything collides. The theme toggle loses `ml-auto` (`md:ml-0`) and sits directly after the account controls at the right edge of the column. The switch point is `md`, not `sm`, because a 592px column cannot hold the long tagline plus the signed-in cluster.

### Page frame

- Root: a plain block (`min-h-screen` is not needed; the body is already `min-h-full flex flex-col` with themed background).
- Header: `DotField` full-bleed (its hairline `border-b border-border` spans the viewport), content in `Container as="header"`.
- Main: `Container as="main" className="pb-16"` holds the `Tabs` flush under the header and the active `TabPanel` with `pt-8 sm:pt-10` above the screen. Screens add no width and no top padding of their own.
- The tablist keeps its own hairline (from `Tabs`). The header rule and the tab rule are two separate lines about 44px apart; this is intentional (a nav band) and the Polish designer may tune the gap but not merge them.

## 4. Dot Field

Exactly as the Director specified, no additions:

```tsx
<DotField
  spacing={16}
  className="min-h-0 items-stretch border-b border-border bg-transparent dark:bg-transparent text-border-strong dark:text-border-strong"
>
  <Container as="header" className="relative py-8 sm:py-10"> ... </Container>
</DotField>
```

- `relative` on the header container is required so text paints above the canvas.
- No overlay, gradient or `backdrop-*` over the field. Leave `interactive` at its default.
- The vendor masks the canvas to be quietest where the content sits, and it respects `prefers-reduced-motion`. No work needed.
- The `Dialog` is portalled to `document.body` (see section 6) so pointer events inside it do not bubble to the field's native listeners.

## 5. States

### Header account area

| State | Render |
|---|---|
| Auth unknown (first request in flight) | One `Skeleton` `h-10 w-48` where the buttons will be, plus the live `ThemeToggle`. No sign-in buttons are shown yet (avoids a signed-in user seeing "Sign in" flash). |
| Signed out | `Sign in` (`secondary`) + `Create account` (`primary`). |
| Signed in | Identity link + `Sign out` (`ghost`). |
| Signing out | Same row; `Sign out` has `loading` and reads "Signing out…". |

**Identity link** (signed in): one `TextLink variant="plain"` to `/u/${username}`, a flex row `inline-flex min-h-10 min-w-0 items-center gap-2`: `@username` (`truncate font-medium`, Geist Sans, **not** mono) and `My stats` (`shrink-0 text-muted-foreground`). The whole thing is one 40px-high tap target; the link's accessible name is "@username My stats". "My stats" is always visible (the old UI hid it on phones, leaving an unlabelled handle).

### Tabs

| State | Render |
|---|---|
| Default | View selected. |
| Not signed in / no boards | View and Create only. |
| Has boards | View, Create, Edit. |
| Edit selected, then the user loses boards (sign out, delete last board) | Derived tab falls back to View. Never leave the page with no selected tab and an empty panel (current bug). |
| Auth unknown | View and Create shown; Edit may appear once auth resolves. |

### Content area

| State | Render |
|---|---|
| Auth unknown | Panel shows a 3-row skeleton (`Skeleton h-11` rows, `space-y-2`) shaped like the leaderboard table. Screens are mounted only after auth resolves so they never render a wrong signed-out state or fetch twice. The auth call is a single round trip that already happens today. |
| Ready | The active screen: `ViewLeaderboards`, `CreateLeaderboard`, or `EditLeaderboards` (unchanged props). |
| Auth request fails | Treated as signed out and `authReady` becomes true (the loader uses try/finally), so the app is never stuck on skeletons. |

### Config banner (misconfigured only)

Full-width strip above the header, not dismissible. Wrapper `border-b border-border bg-warn-subtle`; inside it a `Container` with a `Notice tone="warning"` (`className="rounded-none bg-transparent px-0 py-3"` so the tint is carried by the strip and the text aligns to the column's left edge; twMerge resolves the Notice's own background). The message from `getSupabaseConfigError()` is the title line; the instruction follows.

### Sign in / Create account dialog

| State | Render |
|---|---|
| Closed | `Dialog open={false}` stays mounted (it renders a closed native dialog). |
| Open, clean | Title, mode-switch line, Username, Password, Cancel + primary. Focus lands in Username. |
| Field validation error | Error text under the field via `Field error`, red border via `aria-invalid`; focus moves to that field. Only the first failing field is reported at a time (username before password). |
| Form-level error (auth, config, network) | `Notice tone="error"` between the fields and the buttons, `role="alert"`. |
| Submitting | Primary button `loading`, label "Please wait…". Pressing Enter does nothing while disabled. |
| Success | Dialog closes, fields cleared, `onAuthChange()` then `router.refresh()`. |
| Mode switch | Errors cleared; entered username and password are kept. |
| Close (Esc, backdrop, Cancel) | Errors cleared, password cleared, username kept. |

### 404

`app/not-found.tsx`: `Container as="main"` with `flex flex-1 items-center`, centred `EmptyState`. No header, no Dot Field.

## 6. Copy (short, plain)

| Where | Text |
|---|---|
| Wordmark | Kleos |
| Tagline | None (removed at the owner's request; the wordmark stands alone) |
| Tablist `aria-label` | Leaderboards |
| Tabs | View, Create, Edit |
| Signed out | Sign in, Create account |
| Signed in | `@username`, My stats, Sign out, Signing out… |
| Dialog title | Sign in / Create account |
| Mode-switch line (dialog description) | "No account yet? **Create one**" / "Already have an account? **Sign in**" (the bold part is a `Button variant="link"`) |
| Username label / hint | Username / "Use a username, not an email. Example: jayden_w" (no placeholder, the hint carries the example) |
| Password label | Password |
| Password hint (create mode only) | At least 6 characters. |
| Cancel / submit | Cancel / Sign in or Create account; loading: Please wait… |
| Username error | Username must be 3–20 letters, numbers or underscores. No email. |
| Password error | Password must be at least 6 characters. |
| Wrong credentials (`Invalid login credentials`) | That username and password don't match. Check them, or create an account. |
| Username taken (`User already registered`) | That username is taken. Pick another, or sign in if it's yours. |
| Rate limit (message matches `rate limit` or `after N seconds`) | Too many attempts. Wait a minute, then try again. |
| Thrown / offline | Couldn't reach the server. Check your connection and try again. |
| `signUp` returned no user | Couldn't create the account. Try again. |
| Profile insert failed (code other than 23505) | Couldn't save your profile: {message} |
| Any other Supabase message | Shown verbatim. |
| Config error inside the dialog | {configError} See the notice at the top of the page. |
| Config banner | {configError} Set `NEXT_PUBLIC_SUPABASE_URL` to your Supabase project URL (`https://xxx.supabase.co`) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your publishable key in your Vercel environment variables, then redeploy. Env var names and the example URL in `font-mono` spans. |
| 404 title / description / action | We couldn't find that page / The link may be mistyped, or the board or player was removed. / Back to Kleos |

Error mapping lives in `components/shell/auth-errors.ts` (pure function `friendlyAuthError(message, mode)`), matching on lower-cased substrings so wording changes in Supabase degrade to the verbatim message instead of breaking.

## 7. Primitives

`Container`, `Tabs`, `TabPanel`, `Button`, `buttonVariants`, `Dialog`, `Field`, `Input`, `Notice`, `Skeleton`, `EmptyState`, `TextLink`, `ThemeScript`, `ThemeToggle`, `cn`. Kokonut `DotField` through props and `className` only. Icons: only those already inside the primitives; the shell adds none.

Local build (not a primitive yet): none required. Candidates for promotion are in the ADR.

## 8. Interactions and motion

- Nothing animates on load or on tab switch. No new motion is introduced.
- Tab underline: 200ms scaleX ease-out (built into `Tabs`). Hover colour 150ms (primitives). Button press scale 0.98, `motion-safe` (primitives).
- Dialog: 180ms in, 120ms out, centred (globals `.ui-dialog`). Esc, backdrop click, scroll lock and focus return come from the native dialog.
- Theme switch is instant (no colour transition on the root; do not add one).
- Dot Field idle drift and swipe ripples are vendor behaviour; reduced motion is respected by the vendor.
- Keyboard: Tab order follows the visual order (brand, account controls, toggle, tabs, content). Tabs: arrows, Home, End from the primitive.

## 9. Accessibility

- Landmarks: `header` (banner), `main`, `role=status` config strip. One `h1` on the home page: the wordmark. Screens must start at `h2`.
- Dialog: labelled by its title, native modal semantics. Username is focused on open (explicit `ref.focus()` in an effect after open, since the dialog renders its children while closed). Errors are `role="alert"` (Notice) or live-region (Field).
- Remove `required` and `minLength` from the inputs and add `aria-required="true"` instead: the native bubble would pre-empt our messages (the shared `Dialog` form cannot take `noValidate`). The handler still validates everything, including empty values.
- Autofill: username `autoComplete="username"`, `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`; password `current-password` (sign in) / `new-password` (create). Keep `enterKeyHint`: "next" on username, "go" on password.
- Contrast: all text uses tokens (`foreground`, `muted-foreground`). The tagline sits over the Dot Field; the vendor mask is quietest behind content, but the Polish designer must check the tagline in both themes (target at least 4.5:1 effective contrast around the text).
- Theme toggle labels come from the primitive; known limitation: its server snapshot is "light", so in a dark theme the icon and label swap once after hydration. It is not ours to edit; note it in review.
- The 404 is a normal page: one `h1`-level message (EmptyState title is a `p`; see ADR consequences) and a real link styled as a button.
- Zoom and reflow: no fixed widths; the account row wraps; usernames truncate with the full text available via the link target.

## 10. Behaviours that must survive (checklist)

Auth
1. Sign in with username + password via `supabase.auth.signInWithPassword` on `usernameToEmail(normalizeUsername(input))`.
2. Create account via `supabase.auth.signUp` with `options.data.username`, then insert into `profiles` (`id`, `username`); error code `23505` on that insert is ignored.
3. Validation: `getSupabaseConfigError()` first, then `isValidUsername(normalizeUsername())`, then `password.length >= 6`; messages as in section 6.
4. After success: clear fields, close dialog, `onAuthChange()` (the `refreshAuth` passed from `AppShell`), then `router.refresh()`.
5. Sign out: client `supabase.auth.signOut()`, then server action `signOut()`, then `onAuthChange()`, then `router.refresh()`.
6. Username-only hint stays. Esc, backdrop click and scroll lock close/lock the dialog (now native).
7. `AuthPanel` props stay `{ username, onAuthChange }` plus the new optional `loading` (auth unknown).

Shell
8. `getSessionProfile()` populates `isAuthenticated` and `username`; when a user exists `getMyLeaderboards()` sets `hasBoards`. `refreshAuth` keeps its name/behaviour and is passed to `AuthPanel.onAuthChange` and `CreateLeaderboard.onCreated`.
9. Tab visibility rule: Edit only when `hasBoards`. Tab state is local; default View.
10. Props to screens unchanged: `ViewLeaderboards { isAuthenticated }`, `CreateLeaderboard { isAuthenticated, onCreated }`, `EditLeaderboards { isAuthenticated }`.
11. Switching tabs unmounts the previous screen (as today; `TabPanel` renders only the active one).
12. Config error detection via `getSupabaseConfigError()`; the banner shows the message and the fix.
13. "My stats" link goes to `/u/${username}`.
14. Dot Field stays in the header. Metadata (title, description) unchanged.
15. `/p/[id]` and `/u/[username]` routes are untouched and remain reachable from the app.

Theme
16. `<html>` has no forced `dark`, has `suppressHydrationWarning`; `<ThemeScript />` is in `<head>`; `.dark` class on `<html>` drives the `dark:` variant; `ThemeToggle` is in the header.

## 11. Out of scope / cross-team notes

- The stats pages have their own `<main>` and no header, so the theme toggle is only on the home page; the stored choice and system default still apply everywhere. Candidate: a shared slim header.
- Persisting the last used tab (useful for "I always open Edit at the table") is a behaviour change and is not part of this redesign.
- No sticky tabs, no skip link (three controls precede the tabs).
