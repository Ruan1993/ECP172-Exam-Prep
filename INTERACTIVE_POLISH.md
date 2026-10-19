# Interactive polish and content navigation

## Focused changes

- Learning sidebar, mobile roadmap, dashboard entry points, main previous/next buttons and shared-player navigation now use one content-selection path. After the selected card renders, the reading heading receives focus with `preventScroll` and one measured scroll positions it 24px below the sticky header.
- `contentNavigation.ts` finds the heading's actual scrollable ancestor, or uses the document viewport. It measures the header and scrollport rather than assuming a page-top destination. Reduced-motion users receive instant scrolling.
- The previous horizontal `overflow:hidden` rule created a phantom vertical scrollport on the body and broke sticky positioning. `overflow-x:clip` with visible vertical overflow preserves horizontal clipping without that extra scrollport.
- Card URLs use stable IDs (for example `#q1/q1-school`); overview and revision have their own hashes. Browser Back/Forward restores the selected learning card and reading focus. Native scroll restoration is temporarily manual while the app owns these routes and is restored on unmount. No progress-storage migration was added.
- Shared interactions now cover dashboard cards, learning navigation, learning ratings, revision controls, the audio player and settings/theme buttons. Hover lift, press feedback, icon reactions, selected accents and brief green/amber confirmations are transient. Heading geometry stays stable; reading panels fade and their body text enters gently. Card keys are unchanged, so narration, theme changes and ordinary rerenders do not remount the panel or replay its entrance.
- The revision answer button is now a persistent Reveal Answer / Hide Answer toggle. Its `aria-controls` points to an always-present panel wrapper; the answer, key points and their focus targets are unmounted while hidden. Hiding clears the speech session and rejects stale callbacks. Re-revealing mounts the answer again and replays its entrance. Saved learning and revision ratings are unaffected.
- All new motion has reduced-motion overrides. There are no new dependencies or continuous animation loops.

## Verification — 19 October 2026

- All 100 automated tests pass, including measured viewport/nested-scrollport geometry, focus without duplicate scrolling, instant reduced-motion scrolling, stable card routes, previous/next selection, history restoration, Reveal/Hide/Reveal, hiding during active narration, stale restart prevention, hidden-answer focus removal, unchanged ratings, content and backup regressions.
- TypeScript/Vite production build and PWA generation pass (19 precache entries).
- Local browser checks cover desktop and 390px mobile, light/dark themes, multiple sidebar selections, the mobile roadmap, navigation from a deeply scrolled answer, previous/next and actual browser Back/Forward. Settled heading positions were approximately 92px with the header ending at 68px, leaving the intended 24px space.
- Actual speech start, cancellation on card navigation, and hiding an answer during playback were exercised. The browser showed one player, no hidden model answer or remaining focus target after Hide, and a fresh answer on re-reveal. Existing speech preferences remain unchanged.
- Visible selected-card accents, green learning confirmation/ring, amber confirmation across the revision transition, answer unfold/reveal replay and touch-sized controls were inspected. Console error inspection was clean.
- Audible output was not independently heard. Physical PWA lifecycle and dedicated screen-reader checks were not performed. Browser reduced-motion emulation was unavailable through the browser controls; automated tests exercise both motion preferences and verify the CSS overrides.

Commit, push and exact production deployment verification are reported in the chat.
