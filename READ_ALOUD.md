# Interactive study reader

All reading surfaces share `SpeechController`: Learn First cards, expanded past-paper summaries, About this guide, and the legacy learning activities. The contextual Read aloud button starts continuous reading. Clicking or tapping supported sentence text immediately cancels the previous utterance and reads that sentence once. Selecting text, copying, links, disclosure summaries, form fields and other controls retain their normal behavior.

## Highlights and follow reading

A DOM Range maps the exact, unmodified sentence text to speech. CSS Custom Highlights paint text only; educational markup, card backgrounds, inline emphasis and layout remain unchanged in both themes. Real `word` boundary events identify UTF-16 offsets; `Intl.Segmenter` validates a word start and determines its full text. Only that word receives bright yellow with dark text. There is one highlight range, replaced immediately on every word/sentence transition. Invalid or backwards word offsets disable word tracking for that utterance. Missing boundaries use inline sentence text as the fallback. No timers invent word positions. Pause and single-sentence completion retain the selected sentence inline; Stop, errors, completion and navigation clear the highlight.

Automatic following considers the sticky header, actual player height and sentence geometry. It scrolls only when needed during active reading and respects reduced motion. Wheel/touch scrolling or reading-area navigation keys temporarily suspend following. The Follow reading icon reactivates it. A direct sentence click scrolls to its text even if following is off. Closed or removed content cancels its active session.

## One persistent player

One fixed bottom player serves all Read aloud entry points. It remains available while reading, paused, finished or awaiting error recovery. Compact Lucide controls provide previous/next sentence, a combined Play/Pause button, Follow reading, volume, settings and Stop. Play deliberately reads continuously from the selected sentence. Pause/Play may repeat that sentence, avoiding unreliable native resume behavior. Session tokens reject callbacks from canceled utterances, including word boundaries.

Volume normally displays only an icon. Its nonmodal popover contains a 0–100% slider and mute/unmute. The prior nonzero volume is saved and restored on unmute, including across reloads. Outside pointer/focus interaction and Escape dismiss the popover; Escape restores trigger focus. Volume changes apply to the next utterance without restarting current speech. Speed and device voice live in a separate compact settings popover. Changing them pauses reading. The sentence picker is only under Keyboard sentence navigation in settings, providing an equivalent keyboard route without adding text buttons or a dropdown to the primary interface.

The player reserves its measured height below the page and accounts for safe-area insets. On narrow screens its two rows keep every icon target at least 44px. Popovers sit above playback controls and scroll internally on short screens. Follow mode, rate, voice, volume and previous nonzero volume share the existing `ecp172-read-aloud-v1` preference store. Transient sessions and manual follow suspension are not persisted. Study content and student progress schemas/keys are unchanged. No runtime dependencies were added; `happy-dom` and `tsx` support DOM interaction tests only. `.vercelignore` excludes temporary folders from CLI preview uploads.

## Verification — 19 October 2026

- 67 automated tests: controller state/events/preferences, range mapping across inline emphasis, word-only painting, inline fallback, cleanup, immediate clicks, selection/link exclusion, nested readers, popover dismissal, mute restoration, keyboard navigation, follow geometry/reduced motion, route cleanup and unchanged progress.
- DOM tests use explicit synthetic geometry and speech events; they do not claim real layout or audible device playback.
- TypeScript/Vite production build and PWA service-worker generation pass; precache includes the reader.
- Clean Vercel preview checked in the in-app browser at 320, 360, 390 and 430px, light and dark: no horizontal overflow, all playback targets at least 44px, volume popover within the viewport and above essential controls. Desktop player/settings inspected too.
- Native Windows browser speech exercised: moving word-only highlight observed, direct sentence click started playback, natural completion stopped at that sentence, Play/Pause worked, volume keyboard adjustment/mute restoration/Escape verified. No reader-specific console errors were observed.
- Audio was not independently heard. No physical Android device or dedicated screen-reader test was available. Device voices may require internet, omit or misreport boundaries, and be interrupted by backgrounding or screen lock. Exact-word resume and uninterrupted background/lock-screen operation are not promised. Older browsers without CSS Custom Highlights retain speech and controls but cannot paint the ranges.
