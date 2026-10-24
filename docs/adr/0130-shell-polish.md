# 130. Shell, navigation and auth: polish

Status: Accepted

## Context

ADR 120 built the shell to the spec in `docs/design/features/shell.md`. This pass reviewed that build against `DIRECTION.md` and the spec with an Operate lens (phone at the table, thumbs, dim light): hierarchy and rhythm, every state, keyboard and screen-reader behaviour, motion, copy. The build was already close, so the changes are small and aimed at defects a person would actually hit. Nothing was run in a browser (no `next dev` or build allowed for parallel teams); verification is `tsc` and ESLint, both clean for the shell files, plus a read of the primitives' source. Contrast around the tagline was checked arithmetically, not by eye (see Consequences).

## Decision

Files changed: `components/AppShell.tsx`, `components/AuthPanel.tsx`, `components/AuthModal.tsx`, `components/ConfigBanner.tsx`, `components/shell/SiteHeader.tsx`, `app/not-found.tsx`. `app/layout.tsx` and `app/page.tsx` were reviewed and left alone.

**Auth state is no longer lossy (`AppShell`).**
- `loadAuthState()` now returns `null` when the session check fails and `hasBoards: null` when only the boards lookup fails. `resolveAuth(prev, next)` folds the result in: a failed first check is signed out and ready (never stuck on skeletons, as before); a failed refresh keeps what the person already saw; an unknown board count keeps the previous value. Before, one transient error after sign-in made a signed-in person look signed out, and a failed boards lookup did the same. The boards lookup also now honours the `error` field that `getMyLeaderboards` returns instead of reading an error as "no boards".
- The three `pt-8 sm:pt-10` panel strings are one `panelClass` constant.

**Header (`SiteHeader`).** Tagline gets `mt-1`; the wordmark and tagline were touching. No other layout change: the spec's breakpoints and wrapping hold.

**Account controls (`AuthPanel`).**
- Sign out can fail visibly: a `role="alert"` line "Couldn't sign out. Check your connection and try again." in `text-loss`, cleared on the next attempt. Sign out now awaits `onAuthChange` (the prop type widened to `void | Promise<void>`, compatible with existing callers) so the button does not flip back to "Sign out" while the header is still catching up.
- A visually hidden `role="status"` region, mounted once at a stable position in every branch, announces "Signed in.", "Account created. You are signed in." and "Signed out.". Nothing is announced on page load.
- Focus is not lost when the control you used disappears. After sign in or sign up, focus moves to the identity link; after sign out, to the Sign in button (`focusAfterChange` ref plus an effect that sets no state).

**Dialog (`AuthModal`).**
- Backdrop-drag fix, without touching `Dialog`: a capture-phase `pointerdown` listener (only while open) records whether a press began inside the dialog; the `onClose` handed to `Dialog` ignores the one backdrop click that ends such a press. Any `keydown` clears the flag, so Esc always closes; Cancel calls the real `onClose` directly. Selecting text in Username and releasing outside the dialog no longer closes it.
- Enter in Username with an empty password moves to Password instead of submitting (the keyboard shows "Next"; submitting produced an error for a field the person had not reached). It still submits when a password is present, and IME composition is respected.
- Show/hide password: a local control (ghost `Button size="icon"`, 40px, Eye / EyeOff at 16px) inside the field. `aria-label="Show password"` with `aria-pressed`, `onMouseDown` prevented so the field keeps focus and the phone keyboard stays up. The revealed state resets when the dialog closes (adjust-state-during-render pattern, so no setState in an effect). Password also gets `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`.
- The "Create one" / "Sign in" link buttons get `-my-1 py-1` for a taller hit area without moving the line.

**Config banner (`ConfigBanner`).** The message from `getSupabaseConfigError()` is now the `Notice` `title` and the fix is the body, as the spec says ("title line"). The build had run both into one paragraph.

**404 (`not-found.tsx`).** Local markup replaces `EmptyState` so the page has a real `h1` (`text-2xl font-semibold`, balanced by the global h1 rule), a muted `text-pretty` line and the primary button. It sits slightly above optical centre (`pt-16 pb-24`). Centred text is allowed here by DIRECTION section 7.

Reviewed and kept: the doubled hairline (header rule, then the tab rule 44px below) the spec calls intentional; `ThemeScript` placement and `suppressHydrationWarning`; derived active tab; skeleton shape (3 x `h-11`); `Skeleton` pulse (reduced motion collapses it through the global rule); all tokens (no raw palette, no `transition-all`, no uppercase, no gradients). No motion was added: nothing animates on load or tab switch, and the dialog, tab underline and button press come from the primitives. Mono is used for the env var names in the config banner only; they are code a person must copy, which the spec asks for, and it is the one exception to "mono is for the share code".

## Consequences

- Fewer false "signed out" states after a flaky request; the price is that after a failed sign-out refresh the header can still show the signed-in controls until the next successful check.
- Two document listeners exist only while the dialog is open, and use refs, not state. They depend on `Dialog` closing on a `click` whose target is the `<dialog>`; if the primitive adopts a pointerdown/up check, the guard becomes redundant and can be deleted.
- Browser check still owed by someone with a dev server: tagline contrast over the Dot Field (arithmetic says about 4.1:1 only where a full-strength dot sits directly behind a glyph, and the vendor mask is quietest behind content, so effective contrast should clear 4.5:1); the 320px signed-in header with a 20-character username; focus return after sign in and out; the dark-mode `ThemeToggle` icon swap after hydration (primitive limitation, unchanged).
- Known and unchanged: a person who is authenticated but has no `profiles` row has `username === null` and so sees Sign in / Create account; `AuthPanel` only receives the username. Tab buttons carry `aria-controls` for panels that are not mounted while inactive (primitive behaviour).

## Alternatives considered

- Making the failed sign-out silent (the spec): rejected; a button that resets with no explanation reads as a broken button.
- A toast for sign in / out: rejected; motion and a new component for a state the header already shows. A live region gives screen-reader users the same confirmation at no visual cost.
- Fixing the backdrop-drag issue in `Dialog`: not allowed (primitives are frozen). Recorded as a candidate fix there (compare `mousedown` and `mouseup` targets).
- A shared `PasswordField` primitive: kept local to `AuthModal` for now; it is the only caller. Candidate if sign-up grows a confirm field or settings gets a password change.
- Setting `required` back on the inputs to get native validation: rejected, as in ADR 120 (the bubble pre-empts the app's messages and `Dialog` cannot take `noValidate`).
- Adding a wordmark or illustration to the 404: rejected; the primary button already names the product, and restraint is the brief.
- Lifting the Dot Field's quiet zone with an overlay behind the tagline: rejected (DIRECTION forbids any wash over the field).

Candidate primitives: `Banner` / `NoticeStrip` (full-bleed config strip), `PasswordField`, `EmptyState` with a heading level, and a slim shared `SiteHeader` for `/p` and `/u`.
