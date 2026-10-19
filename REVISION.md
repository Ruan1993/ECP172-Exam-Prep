# Active recall revision

The revision destination now provides eight curated questions for each of Q1–Q4. Enter from **Revise Again** on the overview, the existing **Revise later** navigation item, or **Revise Again** on a learning card. The latter keeps the learning bookmark and opens related questions first.

Each question starts with its answer and hint absent from the DOM. Think, optionally show a hint, reveal the answer, then choose **Got it!** or **Revise Again**. Navigation always hides the next answer and cancels old speech. All-understood sections remain available for another pass. Related learning cards remain accessible in a disclosure.

## Data and compatibility

- `revisionBank.ts` defines 32 stable semantic IDs, source-card references, prompts, hints and model key points. Many answers take their exact paragraphs from the current guide. Curated scenario summaries remain based on that guide. The learning guide itself is unchanged.
- `revisionProgress.ts` sorts explicit question revision flags first, unanswered questions linked to learning bookmarks next, other unanswered questions next, and understood questions last. An explicit question rating takes precedence over inherited priority. Sorting happens when entering/reopening a section; rating cannot rearrange an active session.
- The existing `ecp172-learn-first-v1` state has an optional `revision.ratings` map. Learning `ratings`, positions, card IDs, legacy quiz/exam storage and reader preferences remain intact. Resetting reading choices keeps revision ratings.
- Existing version-one backup downloads include both rating maps. New backups round-trip both maps; importing an old backup preserves current revision ratings. Imports with revision data replace question ratings as explained in the confirmation. Validation/migration discards invalid rating values.

## Reader and interactions

Revision reuses the existing single player, read-aloud range hook, spoken-text normalisation, Follow Along, preferences and sentence navigation. It registers its question navigation with the same player. Only the question and any revealed hint/answer are within the reading scope. Reveal and hide actions stop old narration. Q4 paragraphs reuse the seven existing numbered concept/colour associations and active paragraph highlighting.

Question entrances slide/fade over 480 ms, with staggered heading/support text. Answers unfold and settle over 520 ms, with staggered key points. Got-it confirmations have a green ring/check effect; revise-again confirmations have an amber ring/rotating icon. Buttons lift on hover and press on touch. All are CSS animations with no added dependencies; reduced-motion rules disable animation, transitions and movement.

## Verification — 19 October 2026

- 94 automated tests pass, covering bank/source validity, prioritisation, separate persistence, old/new backup round trips, hidden answer DOM and speech exclusion, hint/reveal, Q4 colours/paragraph highlighting, speech cancellation, session recovery, repeat revision, and existing learning regressions.
- TypeScript/Vite production build and PWA generation pass (19 precache entries).
- Local browser verification uses a preview on port 5175. Desktop and 320/390 px layouts were inspected in both light and dark themes; no horizontal overflow was found on the inspected mobile layouts. Exactly one player and read-aloud entry point remain after navigation and theme changes.
- The browser exercised hint/reveal, rating feedback, question navigation, real speech start/pause and word highlighting. Entrance, unfold and confirmation animation names/timings were checked in the rendered page, with visible intermediate motion captured. Browser console error inspection was clean.
- An initial global header style conflict was found visually and fixed before commit.
- Audible output was not independently heard. Physical Android/PWA lifecycle and dedicated screen-reader testing were not performed. Reduced-motion coverage checks the stylesheet contract; browser OS-level emulation was not performed.

Deployment status is reported in the chat after approval, push and exact-commit verification.
