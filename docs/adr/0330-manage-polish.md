# 330. Manage feature: polish pass

Status: Accepted

## Context

ADR 320 records the build of the manage feature (Create tab, Edit tab, delete confirmation) against `docs/design/features/manage.md`. This pass reviews that build for fidelity to DIRECTION.md and the spec, hierarchy and rhythm, tabular figures, every state, a 375px phone, keyboard and screen-reader access, motion, and copy. Nothing could be run: `next dev` and `next build` are off limits while the other teams edit, and no browser is available, so the findings come from reading the code against the primitives (`field.tsx`, `button.tsx`, `input.tsx`, `dialog.tsx`, `notice.tsx`) and `globals.css`. Anything that depends on pixels is listed as unverified under Consequences.

The build was sound: tokens only, no motion of its own, every spec state present, lint and types clean. The problems were in the seams, in places the spec was silent or contradicted itself:

1. Whole-form dimming on every Confirm. The fieldset was disabled while applying, so all four fields dropped to 50% opacity and back for a request that usually lasts a few hundred milliseconds.
2. The keypad lied. `enterKeyHint="next"` and `"done"` were set on inputs where Enter either submits the form (Create, Add player, Link) or did nothing (the two Points inputs).
3. The sign toggle stole the keypad. On a phone, tapping the minus button blurred the Points input and closed the keypad, so a negative score cost an extra tap to resume typing.
4. Link and Unlink flashed. After a successful link the draft was cleared and the busy state dropped immediately, while the players reload was still in flight. The row showed an empty input for a round trip, then flipped to "Linked".
5. Focus was lost. After Link, Unlink and after any board delete, the focused control unmounted and focus fell to the page. Nothing confirmed a delete except the row disappearing.
6. Announcements were unreliable. The tie notice, the Create success notice and Add player's "Added Ana." were `role="status"` nodes inserted with their text already inside. Many screen readers miss that. The Add player region also used `empty:hidden`, which puts a live region in `display: none` while empty.
7. A failed players fetch was swallowed. `getPlayers` returns `{ error, players: [] }`; the workbench ignored the error, so a network failure rendered the wrong guidance ("Add at least two players") over a perfectly good board.
8. A failed refetch after delete left the deleted board selected in Edit, because the old list was kept.
9. Delete lingered. The dialog closed first and the list refreshed after, so the deleted board stayed on screen, selectable, for a moment after the dialog was gone.
10. Small things: text-only buttons (Delete, Delete board, Unlink) were inset 16px from the column edge so their labels did not align with the headings and fields; "Starts at 1,000 ELO" and the score inputs were not tabular; the Edit loading skeleton was shorter than the label-plus-select it stands in for, so the page jumped on load; the "no other players" guidance sat below a dimmed form, out of sight on a phone; a stale server error stayed on screen while the user fixed the field.

## Decision

All changes stay inside the owned files. No primitive and no `globals.css` was edited.

**New: `components/manage/live.tsx` (`Live`).** A polite live region that is always mounted, with no margin of its own so it costs no space when empty. Messages inside it use `<Notice role="none">` so the text is announced once, by the region. Used for the tie notice (Record) and the success notice (Create). Spacing lives on the message (`mt-6`, `mb-4`), never on the wrapper, which is why the surrounding `space-y-*` containers in those spots became plain blocks with explicit margins.

**RecordMatch**
- Applying no longer disables the fieldset. The fieldset is disabled only when the form cannot be used (loading, error, fewer than two players). During a confirm, the fields grid gets `inert`, so nothing can be edited mid-request and nothing dims. The preview and its buttons are outside the grid, so Confirm and Edit scores keep their own loading and disabled states.
- Player-load failure is now a state: `Notice tone="error" title="Couldn't load the players"` plus a "Try again" button (`loading` shows "Trying…"). The form stays disabled and no "add two players" message is shown over an error. A failed refresh after an action also surfaces here, because stale ratings would make the preview wrong.
- The "Add at least two players" notice moved from directly above Preview to directly under the section description, above the dimmed form. A user who has just created a board lands on a dimmed form; the reason should be the first thing they read, not something below the fold. This departs from spec 4.2, which says "above the Preview button".
- The tie notice is in a `Live` region (it appears in response to a tap and nothing else on screen announces it).
- Enter now does what the keypad says. Enter in Points 1 moves focus to Player 2; Enter in Points 2 dismisses the keypad so Preview is visible. Neither advances the flow, so the spec's rule that a stray Enter can never preview or confirm still holds. This departs from spec 8 ("Enter inside a Points input does nothing") only in that it moves focus.

**ScoreInput**
- Tapping the sign toggle keeps the keypad open: `onMouseDown` is prevented so the input never blurs, and a pointer click (`event.detail > 0`) focuses the input afterwards, so tapping minus first also leaves the keypad up and ready. A keyboard press (`detail === 0`) keeps focus on the toggle so keyboard users keep their place. This replaces the spec's "keep focus on the toggle", which was right for keyboards and wrong for thumbs.
- `maxLength={7}` (six digits and a sign): far beyond any real score, short of numbers that would break the preview sentence. `lib/match-scores` is unchanged.
- The input is `text-lg font-medium tabular-nums`: scores are the content at the table (Direction principle 3), and 18px still clears the iOS zoom threshold.
- `onEnter` prop (above).

**MatchPreview.** The rating line reads "From 1,000 to 1,012" to a screen reader instead of "1,000 rightwards arrow 1,012": the arrow is `aria-hidden` and sr-only "From" and "to" carry the sentence. Visually unchanged.

**BoardWorkbench.** `refreshPlayers()` is now an async function called from handlers, not from an effect. It returns once the new list is in state, and a request counter makes sure only the newest response writes. The effect only does the initial load per board (the workbench is keyed by board id). It also owns `playersError` and passes `loadError` and `onRetry` to Record. `reloadKey` is gone.

**LinkedAccounts**
- A row keeps its busy state and draft until `onChanged()` has resolved, so it flips straight from the unlinked shape to "Linked" with no empty-input flash.
- After a successful link, focus moves to that row's Unlink button; after an unlink, to its username input. A no-deps effect applies this once the new shape exists, and gives up if the user has already moved focus elsewhere. Before this, keyboard and switch users were dropped back to the top of the page.
- The input is `readOnly` while linking. `enterKeyHint="go"` (Enter submits the row's form). Unlink uses `-mr-3 px-3` so its label meets the right edge.

**AddPlayer**
- "Added Ana." moved beside the button (`flex-wrap items-center`), where the eye already is, and is a permanently mounted `<p role="status">` with no `empty:hidden`. An empty `<p>` collapses to nothing; there is no spacing to leak.
- Server error clears when either field changes. Name gets `autoCapitalize="words"` and `spellCheck={false}`. Both inputs use `enterKeyHint="go"` (Enter submits, as the keypad now says). Double-submit guard.

**CreateLeaderboard**
- Both fields use `enterKeyHint="go"` (the Name field's "next" key was submitting the form). Starting ELO has `maxLength={5}` (10000 is the ceiling) and `tabular-nums`. The server error clears as the user edits. The success message sits in a `Live` region, with the share code in a tabular weight.
- Delete: the dialog stays up, with the confirm button busy, until the list has refreshed, then closes on the fresh list. Success leaves a quiet `Deleted “Friday night pool”.` line (`role="status"`, focused) at the top of "Your boards", which also holds the place of the vanished row and gives focus somewhere to land. The section stays visible while that line is shown, even when it was the last board; a new submit clears it.
- Rows: the meta line is `tabular-nums`; Delete is `-mt-2 -mr-3 px-3` so its 40px target is centred on the name's first line and its label meets the column edge. The row is `flex` (no `flex-wrap`): the text block is `min-w-0 flex-1`, so wrapping was never reachable and only invited a bug.
- The load error and Try again now render inside one "Your boards" section with the skeleton and the list, instead of three separate Section trees.

**EditLeaderboards**
- Same delete sequence as Create, with the same "Deleted …" line under the selector (focused). If it was the last board, the empty state carries the sentence in its description (`Deleted “X”. Create a board to add players and record matches.`) inside a focusable wrapper.
- If the refetch after a delete fails, the deleted board is filtered out of the list locally, so it can no longer be selected.
- The loading skeleton now has a label-height bar above the select-height bar (`space-y-1.5`, 20 + 6 + 40px), the same height as the Field it stands in for. The page no longer jumps when boards load.
- "Delete board" aligns its label to the left edge on phones (`-ml-3 px-3`) and to the right edge from `sm` (`sm:-mr-3`); the `sm:mb-1.5` offset for the Field's error slot is kept.

**ConfirmDialog** is unchanged. It was already correct: always mounted, Cancel first in the DOM so initial focus lands on the safe choice, Esc and backdrop ignored while loading, solid red only on the confirm button.

## Consequences

- The record flow on a phone is faster and stays calm: the keypad stays up through a sign toggle, Next goes to the next field, Done dismisses the keypad, and confirming no longer flickers the whole form.
- Every dynamic message that matters is either focused (Record success, Deleted lines, the preview region) or inside an always-mounted live region (tie, create success, Added). Error Notices remain `role="alert"`.
- Link and Unlink are visually continuous and keep keyboard focus. A delete leaves a visible and audible confirmation and focus has a destination.
- Failures that used to be silent now show a message with a way out: players failed to load, and a delete whose refetch failed.
- Departures from the spec, all in the direction of its own goals: the two-player notice moves above the form; Enter in Points moves focus; the sign toggle returns focus to the input on pointer taps; `maxLength` on scores and starting ELO. Spec 4.2, 5.4 and 8 should be read with those changes.
- `BoardWorkbench.refreshPlayers` replaced the `reloadKey` effect, so an in-flight earlier reply can no longer overwrite a later one.
- Open and unverified:
  - Nothing was seen in a browser. The assumptions most worth a look at 320/360/390/768px in light and dark: the `-mr-3` / `-ml-3` optical alignment of the text buttons (hover tint extends 12px into the gutter, so at 320px it must not cause horizontal scroll; it extends into padding, which does not scroll); the Edit skeleton height against the real select; the Add player status line wrapping beside the button on 320px.
  - `onMouseDown` preventDefault on the sign toggle keeps focus in the input on desktop and Android. Behaviour on iOS Safari should be confirmed on a device; if it still blurs, the pointer-click `focus()` reopens the keypad.
  - `AppShell` still does not pass `onCreateBoard` or `onBoardsChanged` to `EditLeaderboards`. Until the shell team wires them, the empty state has no "Create a board" action and the shell's `hasBoards` does not refresh after the last board is deleted, so the Edit tab stays visible showing the empty state.
  - `ShareCode`'s copy button is 32px (below the 40px floor) and its accessible name is "Copy code" for every row in Your boards. Both belong to the primitive; a `label` prop (for example "Copy code for Friday night pool") and a 40px option would fix them.

## Alternatives considered

- **Keep the disabled fieldset while applying.** Rejected: dimming four controls for a sub-second request is motion for its own sake, against "motion confirms, never performs". `inert` blocks edits without the flash. A disabled fieldset remains for the real unusable cases, where dimming explains why.
- **Make Enter in Points trigger Preview or Confirm.** Rejected: the spec's rule that a stray Enter at the table cannot advance the flow is a good one. Moving focus satisfies the keypad's label without risking a recorded match.
- **Change the keypad hints instead of behaviour** (set both Points inputs to `enterKeyHint="enter"`). Simpler, but a dead key on a phone is still a dead key. Next and Done are useful if they work.
- **Clear the Link draft immediately and live with the flash.** Rejected: it looks like a bug, and the fix (await the reload) costs one `await` and a promise-returning callback.
- **One shared announcer element elsewhere on the page** (an sr-only `role="status"` fed by messages). Rejected for the sr-only duplicate text it leaves in browse mode; a live region that is also the visible message avoids both the duplicate and the missed announcement.
- **Focus the Name input after delete in Create.** Rejected: on a phone that opens the keypad for an action the user did not choose. A non-input status line is a safer landing.
- **Align text buttons by shrinking their padding everywhere.** Rejected: the primitive's padding is right for bordered buttons. The `-mx-3 px-3` is applied only to text-only buttons at a column edge, and is listed as a candidate for a `Button` option below.
- **Move the sign toggle into the input** (a suffix inside the field). Rejected: it saves no width on a phone and would overlap long values; a separate 48px target is easier to hit.

Candidate primitives, built locally and noted for the director: `ScoreInput` (numeric field with a 48px sign toggle, keypad-aware); `Live` (always-mounted live region plus a `role="none"` Notice); the rule-separated list row used in Your boards and Linked accounts; the Field + Select + trailing danger button row (`Field` could offer a way to drop the empty error-slot gap, or `Button` an "edge" option that applies `-mx-3 px-3` to text-only buttons); and `ShareCode` taking a `label`.
