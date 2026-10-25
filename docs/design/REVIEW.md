# Design review: Scorecard direction

Reviewer: Design Director. Scope: shell, view, manage and stats, judged against `DIRECTION.md` (sections 1 and 2 first), the four feature specs, and the ADRs in `docs/adr/`.

## Overall verdict

**Close, with one required fix per area that matters.** The four teams landed one coherent identity. Rendered in light and dark at 1280px and 375px, it reads as a pencil-and-paper scorecard: warm paper, ink, hairlines, tabular figures, colour only on win and loss, one solid ink button per surface, no gradients, no glow, no uppercase labels. The Dot Field is the only decoration. Patterns are consistent across features: `Notice` for messages, `Section` for blocks, rule-separated lists, skeletons shaped like content, the same destructive pattern (quiet red trigger, then solid red confirm in a dialog). No feature or behaviour was lost that I could find.

Three things block sign-off:

1. **Integration gap (shell).** `AppShell` does not pass `onCreateBoard` to `ViewLeaderboards` and `EditLeaderboards`, nor `onBoardsChanged` to `EditLeaderboards`. Two teams reported this and it is real in code. Result: the "No boards yet" states show no action, and after deleting the last board on the Edit tab the Edit tab stays visible on an empty state.
2. **Layout defect (view).** In the rankings table the record column wraps at the en dash on phones ("12–" over "4"). Reproduced at 320, 360, 375 and 390px.
3. **Hygiene.** Nothing else blocks. `npx tsc --noEmit` is clean and `npx eslint .` is clean (details below).

## Checks run

| Check | Result |
|---|---|
| `npx eslint .` | Clean, no output. |
| `npx tsc --noEmit` | Clean. The earlier stale error came from `.next/dev/types/validator.ts` pointing at a removed `app/preview-tmp`. I deleted that generated file, and it is rebuilt by Next. |
| DIRECTION migration grep (raw palette, legacy classes) | Returns nothing. |
| `uppercase`, `font-mono`, `transition-all`, gradient, `backdrop-blur`, `eslint-disable`, `ts-ignore` in feature code | Only the allowed uses: share code input, `ShareCode`, config banner env var names. The `dark:` pair in `SiteHeader` is the Dot Field recipe DIRECTION section 10 prescribes. |
| Console errors and horizontal overflow at 375 and 1280, light and dark | None on any page I rendered. |
| Temporary route and dev server | `app/review-tmp` deleted, dev server killed by PID. |

Method note: Supabase is fake, so data pages cannot load. I rendered the real stats components with sample data, and the real manage components (`RecordMatch`, `AddPlayer`, `LinkedAccounts`, `ConfirmDialog`) with sample players. For the rankings table I rendered the same `RankingsHead` and cell markup as `LeaderboardTable` with sample rows (the real component needs live data), so the wrap finding below applies to the real table. My stand-in `Delete board` button did not copy the real `-ml-3` classes, so I make no claim about that alignment from the screenshots.

## Per-feature verdicts

### Shell: changes requested (small)

What works: header with wordmark, tagline, Dot Field texture, account controls and theme toggle collapses cleanly to two rows at 375px. The auth dialog is calm, 16px inputs, show/hide password, errors named with the way out ("Username must be 3–20 letters, numbers or underscores. No email."), full-width buttons on phones. Light and dark both hold. Tagline contrast over the Dot Field is fine to the eye in both themes at the sizes I rendered. The loss-less auth state handling, focus return and live status are good Operate-mode craft.

Required:
- `components/AppShell.tsx`: pass `onCreateBoard={() => setTab("create")}` to `ViewLeaderboards`; pass `onCreateBoard={() => setTab("create")}` and `onBoardsChanged={refreshAuth}` to `EditLeaderboards`. Why: restores the spec's "Create a board" action on both empty states and makes the Edit tab disappear (the shell already falls back to View) when the last board is deleted. Note that once wired, the manage team's "Deleted … " empty-state inside Edit is no longer reachable through the shell, which is acceptable.

Accepted as is: mono for env var names in the config banner (spec asks for it).

### View: changes requested (one layout fix)

What works: the table reads like a printed league table. Rank left on the board's left edge, name, record, win %, ELO as the heaviest figure, rank 1 distinguished by weight only. Chips for few boards, select for many, no share codes on chips. Title, `Shared` badge and `ShareCode` with Copy are well composed. "Live" is a quiet blue dot. The stale-data footer and the false "Reconnecting" fix are sensible additions. Error replaces hint without layout shift.

Required:
- `components/LeaderboardTable.tsx` (W–L cell): add `whitespace-nowrap` to the record cell (and to the ELO cell for safety). Why: with a long player name the browser squeezes the record column to its minimum width, and an en dash is a break opportunity, so "12–4" renders on two lines. I measured it at 320, 360, 375 and 390px. A wrapped record breaks the tabular column, which is the product's main promise. The skeleton cells need no change. (Director alternative: put `whitespace-nowrap` in `Table`'s `numeric` style in `components/ui/table.tsx`, which would cover the stats tables too. If the director makes that primitive change, this item is satisfied.)

Accepted as is: the left-aligned rank column (a good departure from the spec), the 56px jump with one board (needs a single-board picker the spec rules out), `LiveIndicator` prop change.

### Manage: approved

What works: the record flow is the strongest screen. Player selects and Points inputs are 48px with visible labels; errors sit under their field in red text with a red border and no boxed banners ("Please select Player 1.", "Please fill in Player 1 points."). The sign toggle exists because iOS numeric keypads lack a minus key, and it kept the value (`5` becomes `-5`) in my run. The preview is the one justified card: result sentence, `before → after` per player, large `+50` green and `−38` red with true signs, multiplier line muted, then a single solid Confirm and a quiet Edit scores. Tie handling and Enter behaviour work (Enter in Points 1 moves to Player 2). The destructive dialog follows DIRECTION exactly: Cancel first, solid red only on the confirm. Create, Edit, Add player and Linked accounts use the same section, field and rule-list patterns as the rest of the app.

The ADR's four spec departures (notice above the form, Enter moves focus, refocus on pointer tap, `maxLength`) all serve the table moment and are accepted.

Follow-up outside this team (not blocking): the empty-state action and `onBoardsChanged` depend on the shell fix above.

### Stats: approved

What works: the player page matches the brief point for point: back link, name, `#1 of 4 on Board` plus quiet `@username`, one headline rating in a hairline-topped `StatGroup`, a single ink line for rating history with first→last, delta and range, the Activity Terrain in the warm-grey ramp with an accent day, a rule-separated match list with W/L marks, signed deltas, short dates and `−3 – 21` scores, and a plain head-to-head table. Streaks are the only coloured stats. On 375px the date moves under the opponent and the board name appears on the profile, which keeps the "when" of a match on phones. The skeleton and not-found work are careful.

Accepted as is: the heatmap is small at 375px (the vendor component scales to width; it is a reward, not the lead), and the 30px rating sits slightly lower than its 20px neighbours (a `StatGroup` primitive option).

Recommended, not blocking: the back link on the player page is labelled with the board name but goes to `/`, where the shell may show a different board. Either relabel it to match its destination, or add a `/?code=` deep link in the shell later. I did not block on this because the destination matched the previous behaviour.

## Consistency findings

- **Same pattern, same look:** all four features use `Notice tone="info"` for signed-out guidance and `tone="error"` plus a "Try again" button for failed loads; all use sentence case and the en dash record; all destructive flows use the dialog pattern.
- **Local components that should become primitives (director backlog):** `ScoreInput`, `Live` region, `BackLink`, `NotFoundState` (or a heading level on `EmptyState`), `PageSkeleton`, a rule-separated list row, `PasswordField`, and a `Button` "edge" option replacing the repeated `-ml-3 px-3` / `-mr-3 px-3` hacks.
- **Primitive issues reported by the teams, owned by the director, none blocking:**
  - `Delta` and `ResultMark` put `aria-label` on bare `span` elements, which several screen readers ignore. Use `sr-only` text or `role="img"`.
  - `ShareCode` copy button is 32px (below the 40px floor) and every instance is announced as "Copy code". Add a `label` prop and a 40px size.
  - `Dialog` closes on any backdrop click, including a drag that began inside the dialog. `AuthModal` has a local guard that can be removed once `Dialog` compares pointer-down and pointer-up targets.
  - `Table` `numeric` cells should not wrap (see view fix).
- **Pages `/p` and `/u` have no site header, theme toggle or account controls.** This matches the previous product and the specs, so I am not asking for it, but a slim shared header is the natural next step.

## Required changes summary

1. `components/AppShell.tsx`: wire `onCreateBoard` (View and Edit) and `onBoardsChanged` (Edit).
2. `components/LeaderboardTable.tsx`: `whitespace-nowrap` on the record (and ELO) cells, or the director adds it to `Table` `numeric`.

## Screenshots

All in `docs/design/screenshots/`. Naming: `<screen>-<viewport>-<theme>.png`, viewport `desktop` (1280) or `mobile` (375), theme `light` or `dark`.

- Home (View tab, signed out): `home-desktop-light.png`, `home-desktop-dark.png`, `home-mobile-light.png`, `home-mobile-dark.png`
- Auth dialog: `auth-desktop-*.png`, `auth-mobile-*.png`; validation errors: `auth-errors-mobile-light.png`
- Player page (sample data): `player-desktop-*.png`, `player-mobile-*.png`
- Profile page (sample data, two boards): `profile-desktop-*.png`, `profile-mobile-*.png`
- Rankings and board header (stand-in table): `view-desktop-*.png`, `view-mobile-*.png` (the record wrap is visible on row 1 of the mobile images)
- Edit screen sections: `manage-desktop-*.png`, `manage-mobile-*.png`
- Record a match: validation `record-errors-*`, preview and confirm `record-preview-*`, tie `record-tie-*` (each for desktop and mobile, light and dark)
- Delete confirmation: `delete-dialog-desktop-*.png`, `delete-dialog-mobile-*.png`

The round dark "N" mark visible in some screenshots is the Next.js dev overlay, not part of the product.

## Sign-off

Date: 2026-10-24. Scope: re-check of the two features that had required changes (shell, view). I read the changed files and ran the project checks. I did not re-screenshot, so the 320 to 390px wrap fix is confirmed from the code, not from a render.

| Required change | Result |
|---|---|
| Shell: `onCreateBoard={() => setTab("create")}` on `ViewLeaderboards` | Confirmed, `components/AppShell.tsx` line 146. The prop exists on `ViewLeaderboards` and drives the Create button in its empty state. |
| Shell: `onCreateBoard` and `onBoardsChanged={refreshAuth}` on `EditLeaderboards` | Confirmed, lines 176 and 177. `EditLeaderboards` calls `onBoardsChanged` after a delete once the list is fresh. `refreshAuth` re-checks `hasBoards`. When it turns false, the Edit tab and panel unmount and the derived `activeTab` falls back to View. A failed refresh keeps the previous `hasBoards` (`resolveAuth`), so a transient error does not hide Edit. No new state or effect. |
| View: record cell must not wrap | Confirmed. `whitespace-nowrap` is on the W–L `TableCell` (line 307) and on the ELO `TableCell` (line 318) in `components/LeaderboardTable.tsx`. The director alternative (`Table` `numeric`) was not needed. |
| `npx tsc --noEmit` | Clean, no output. |
| `npx eslint .` | Clean, no output. |
| Temporary route, dev server | None present: no `app/review-tmp`, no running Next process. |

ADR follow-ups: the shell ADR (`docs/adr/0120-shell-build.md`) has a "Review follow-up" section that matches the code. The view team's path `docs/adr/0220-view-build.md` was wrong; they correctly appended to `docs/adr/0211-view-build.md` instead. I accept that and ask for no rename.

Verdict: shell approved, view approved. Manage and stats were approved in the review. All four features are signed off.

Remaining backlog, not blocking and not done (director-owned primitives, none changes behaviour): `Delta` and `ResultMark` accessible names, `ShareCode` copy button size and label, `Dialog` backdrop drag-close guard, optionally moving `whitespace-nowrap` into the `Table` `numeric` style so the stats tables are covered too, a shared slim header for `/p` and `/u`, and the player page back-link label versus its destination. The project has no `PRODUCT.md`; the shell team noted that `/impeccable init` would create one.
