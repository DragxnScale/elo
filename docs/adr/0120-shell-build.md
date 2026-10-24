# 120. Shell, navigation and auth: build

Status: Accepted

## Context

ADR 110 and `docs/design/features/shell.md` specify the redesign of everything around the three screens: root layout and theme bootstrap, the Dot Field header, tabs, the account controls, the sign in / create account dialog, the config banner and the 404. The incumbent code used a neon gradient look, legacy classes (`input-futuristic`, `btn-primary`), a hand-built modal, and carried several defects (two `react-hooks/set-state-in-effect` errors, an empty panel when Edit disappears, a signed-out flash before the first session check, no `try/catch` around submit, native validation bubbles pre-empting app messages, "My stats" hidden on phones). The builder's job was to implement the spec in the files the shell team owns, using only the shared primitives in `components/ui/` and Direction tokens, with every behaviour in spec section 10 preserved.

## Decision

Files and what each does:

- `app/layout.tsx`: removed the forced `dark` class, added `suppressHydrationWarning`, rendered `<head><ThemeScript /></head>`. Fonts, metadata and body classes unchanged.
- `components/shell/SiteHeader.tsx` (new, client): `DotField` with the Director's exact class string and `spacing={16}`; inside, `Container as="header"` (`relative py-8 sm:py-10`, flex column with `gap-5`, row from `md`). Brand block (`min-w-0`: `h1` wordmark, balanced muted tagline) and an account cluster (`shrink-0 flex-wrap gap-2`) holding `AuthPanel` and `ThemeToggle` (`ml-auto md:ml-0`).
- `components/shell/auth-errors.ts` (new): `friendlyAuthError(message, mode)`, a pure lower-cased substring mapping (invalid credentials, already registered, rate limit / "you can only request this after"); anything else is returned verbatim. `mode` is accepted for the call site but the copy is currently identical in both modes, so it is deliberately unused (`void mode`).
- `components/AppShell.tsx`: one async loader, `loadAuthState()`, returns data and never throws (try/catch; a failure is treated as signed out) with `ready: true` in every path. `refreshAuth` keeps its name (`useCallback`) and is passed to `SiteHeader` (as `onAuthChange`) and `CreateLeaderboard` (`onCreated`). The mount effect calls the loader directly and applies state after `await`, guarded by a `cancelled` flag; this fixes the `set-state-in-effect` error at its cause rather than by suppression. Auth data lives in one state object so a refresh updates it atomically. The active tab is derived (`edit` without boards resolves to `view`), which removes the empty-panel state without an effect. `Tabs variant="underline" idPrefix="shell"` with labels View / Create / Edit; `TabPanel` per screen with `pt-8 sm:pt-10`; until auth is ready the active panel shows three `Skeleton h-11` rows (`role="status"` with an `sr-only` "Loading…") instead of mounting the screen. Frame: `ConfigBanner`, `SiteHeader`, `Container as="main" className="pb-16"`. The `overflow-hidden` and `min-h-screen` wrapper is gone.
- `components/AuthPanel.tsx`: logic and order preserved (config error, username, password, `signInWithPassword` or `signUp` + `profiles` insert ignoring `23505`, then clear, close, `onAuthChange()`, `router.refresh()`; sign-out order client, server action, `onAuthChange`, `router.refresh`). Added: `try/catch/finally` around submit so the button always resets (catch shows the network message); `signingOut` with `Button loading` and "Signing out…"; split errors into `fieldErrors` (username, then password; only the first failure is reported) and `formError` (config, Supabase via `friendlyAuthError`, no-user, profile insert, network); a mode switch that clears errors and keeps values; close clears errors and the password and keeps the username; optional `loading` prop renders `Skeleton h-10 w-48`. `open` and `mode` are separate state so the title does not flip to "Sign in" during the 120ms exit of the Create account dialog. The component returns a fragment so buttons are direct flex items of the header cluster and wrap naturally. Signed-in identity is a `TextLink variant="plain"` with `@username` (truncating, Geist Sans) and an always-visible muted "My stats".
- `components/AuthModal.tsx`: rebuilt on `Dialog size="sm"` with `Field` + `Input`, `Notice tone="error"` for form errors, footer Cancel (secondary) then primary last. Portalled to `document.body` with `useSyncExternalStore(() => () => {}, () => true, () => false)` as the mounted flag (no setState in an effect). Removed `required`, `minLength`, `autoFocus`, the window keydown listener and body overflow code; added `aria-required`, autofill / keyboard attributes per spec. Username is focused from an effect on `open` (the effect runs after `Dialog`'s own effect, which calls `showModal`). A second effect keyed on the `fieldErrors` object identity moves focus to the first field with an error, including when the same message repeats.
- `components/ConfigBanner.tsx`: full-width `border-b border-border bg-warn-subtle` strip containing a `Container` and a transparent, square `Notice tone="warning"` (`break-words`); env names and the example URL are `font-mono` spans with `break-all` so they wrap at 320px. The text names `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `app/not-found.tsx` (new): metadata title, `Container as="main"` with `flex flex-1 items-center py-16`, `EmptyState` and a `next/link` styled with `buttonVariants`.

Tokens used: `background`, `foreground`, `muted-foreground`, `border`, `border-strong` (Dot Field colour), `warn-subtle`. No raw palette colours, gradients, glows, uppercase labels, `transition-all` or shadows in the shell files (the dialog shadow comes from the primitive).

## Consequences

- The shell files contain no legacy classes; the Direction grep over them returns nothing, and `tsc` and ESLint report no errors in them (the only `tsc` error left is a stale `.next/dev/types` reference to a removed `app/preview-tmp` page, outside the shell).
- Screens mount only after the first session check, so anonymous visitors wait one round trip behind a skeleton. This avoids the wrong-state flash and the duplicate fetch.
- A failed `refreshAuth` after sign-in or board creation will also read as signed out (same loader). This matches spec section 5 but could briefly show signed-out UI on a transient error.
- If the user is on Edit and later gets boards again, the stored tab is still `edit`, so Edit becomes active again rather than staying on View. That is a consequence of deriving rather than resetting; it only happens if the stored choice was Edit.
- Sign-out has `try/finally` but no `catch`: a thrown error is not shown to the user (the spec asks for the loading reset only). The button returns to "Sign out" and they can retry.
- `AuthModal` props changed (`error` became `formError` + `fieldErrors`, new `onSwitchMode`); its only consumer is `AuthPanel`, in the same team. Screen props are unchanged.

Primitive limitations hit (none worked around by editing `components/ui/`):

- `Dialog` closes on any `click` whose target is the `<dialog>` itself, so a drag that starts inside an input and ends on the backdrop closes it.
- `Dialog` renders its children while closed, which forces explicit focus management instead of `autoFocus`; `Dialog` also cannot take `noValidate`, which is why native `required` / `minLength` are replaced by `aria-required` and app validation.
- `ThemeToggle` uses a "light" server snapshot, so in dark mode the icon and label swap once after hydration.
- `EmptyState` titles are `<p>`, so the 404 has no heading element.
- `Field` takes a single child element, so the error `Notice` is placed outside the fields.

Candidate primitives: a full-bleed `Banner` / `NoticeStrip` (config strip), a `PasswordField` with show/hide, and a shared slim `SiteHeader` for `/p` and `/u`.

## Alternatives considered

- Calling `refreshAuth()` from the mount effect: it keeps the original lint error, because the callback sets state. A separate data-returning loader whose result is applied after `await` is the proper fix.
- Storing `activeTab` and resetting it in an effect when boards disappear: adds an effect-driven set-state; deriving is simpler and cannot get stuck.
- Hiding "My stats" on phones to save width: rejected (spec); the username truncates instead.
- Putting every error in `Notice`: loses `aria-invalid`, the red border and focus placement on the offending field; so field validation uses `Field error` and everything else uses `Notice`.
- Keeping the effect-set `mounted` flag for the portal: fails the project's React Hooks lint rule; `useSyncExternalStore` is the lint-clean equivalent.
- A wrapper `div` around `AuthPanel`'s controls: would break the header's flex wrapping and place the theme toggle on a separate line on phones.

## Review follow-up

The Design Director's review found one integration gap: `AppShell` passed only `onCreated` to `CreateLeaderboard`, and not the callbacks the View and Edit screens were built to use. Two changes in `components/AppShell.tsx` close it.

- `ViewLeaderboards` now gets `onCreateBoard={() => setTab("create")}`. The "No boards yet" empty state shows its Create action and sends the person to the Create tab.
- `EditLeaderboards` now gets `onCreateBoard={() => setTab("create")}` and `onBoardsChanged={refreshAuth}`. The empty state in Edit has the same Create action. After a board is deleted, `refreshAuth` re-runs the session and boards lookup, so `hasBoards` is current. When the last board is gone, `hasBoards` becomes false, the Edit tab and panel are removed, and the existing derived `activeTab` falls back to View. Nothing new is stored or reset in an effect.

Consequences: `refreshAuth` is async and the prop type is `() => void`, so the returned promise is ignored by the screens. This is safe because `loadAuthState` never throws. A failed refresh keeps the previous `hasBoards` (see `resolveAuth`), so a transient error does not hide the Edit tab. No primitives, behaviour or copy changed.

Alternatives considered: resetting the stored tab to View in an effect when boards disappear was rejected for the same reason as before (effect-driven set-state; deriving cannot get stuck). Passing a separate `onBoardDeleted` callback was rejected because `onBoardsChanged` already exists on the screen.
