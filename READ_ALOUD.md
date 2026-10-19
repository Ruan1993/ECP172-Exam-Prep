# Read Aloud

The current Learn First site has contextual reading on every Q1–Q4 card, including full research examples, scenarios, teacher tips and bookmarked revision cards. About this guide also has reading assistance. Existing legacy Guided Learning, Listen & Learn, teaching activities, Answer Coach/Builder, Quick Revision and Exam Challenge use the same controller. Those legacy activities remain outside the current Learn First navigation; this change does not restore removed routes.

## Playback

Choose Read aloud or Restart reading to read the visible content. Pause cancels the current short utterance while keeping its segment index. Resume creates a fresh utterance for that segment. It may repeat the current sentence or short segment, never promises exact-word resume, and does not depend on native `paused` state. Only one device speech queue is used. Session tokens ignore cancellation and completion events from older utterances. Utterances are retained while speaking. Long paragraphs are split into sentences, with long sentences split at word boundaries around 220 characters.

The former Listen & Learn used a whole-card utterance, native pause/resume and a resume handler gated on the browser's `paused` flag. There was no recovery if the browser failed to resume. Its rate effect also canceled/restarted playback and automatically spoke on entry. These paths have been removed. Listen & Learn advances only after deliberate playback begins. Device interruption, backgrounding and screen lock still depend on the browser and speech service.

Speed and actual device voice preferences live only in `ecp172-read-aloud-v1`; old voice preference is read for compatibility. Existing progress schemas, migrations, scores and rating keys are untouched. Settings changes pause at the current segment and await Resume. Speech text is a snapshot of visible educational content; buttons, form fields, navigation, decorative/hidden content and closed disclosure bodies are excluded. Re-read after opening an explanation to include it.

Browser voices can require network access. Local voices can work offline; no external speech service was added. The PWA precache includes the new implementation.

## Verification (19 October 2026)

- All 39 Node tests pass, including eight controller tests for playback, repeated pause/resume, stale callbacks/duplicate starts, stop/restart, completion, segmentation, preferences, progress isolation, absent API and speech errors.
- Production TypeScript/Vite/PWA build passes; diff whitespace check passes.
- Deployed native Windows speech API: Read aloud, two Pause/Resume cycles and next-card cancellation exercised through the browser. This verifies API/UI behavior, not independently heard audio output.
- Responsive browser checks at 320, 360, 390 and 430 pixels: no horizontal page overflow; toolbar buttons at least 44 pixels high. Dark-mode settings inspected visually.
- No physical Android Chrome testing was available. Mocked tests and desktop API observations do not establish audible Android reliability. Exact-word resumption is intentionally not supported.

API reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel

## Click-to-read sentences (19 October 2026)

Supported visible headings, paragraphs, list items, quotations and definition entries can be clicked or tapped to read one sentence. The same DOM Range supplies the speech text and the bright yellow CSS Custom Highlight for continuous and single-sentence reading. Inline emphasis remains intact. Blocks containing controls or links, hidden content and closed disclosure content are excluded. Nested past-paper readers handle a click once.

Selecting text does not start speech. Normal copying, semantic content and focus remain intact. The labelled Sentence selector and Read selected sentence button provide the keyboard equivalent. Continue from selected sentence deliberately starts continuous reading at that sentence. A single-sentence completion retains the highlight and position, does not advance, and does not invoke lesson completion. Resume repeats only that sentence; Stop clears the highlight. Existing card/route cleanup still cancels speech.

Follow reading scrolls only during active narration, respects reduced motion, and suspends after wheel, touch scrolling or reading-area navigation keys. Re-enable it with Follow reading. Speed, device voice and speech volume share the existing preference store. Volume changes affect the next utterance without interrupting current speech. No study progress keys or content were changed. No dependencies were added.

Verification: 50 Node tests pass, including selected-sentence cancellation, stale events, explicit continuous continuation, rapid changes, volume persistence, wrapped-line hit testing and interactive exclusions. TypeScript/Vite/PWA production build passes. Controller tests simulate speech; they do not establish audible device playback. The available browser could not reach the local development server (both localhost and 127.0.0.1 timed out), so current mobile layout, screen-reader behavior and physical Android audio remain unverified. CSS Custom Highlights require a browser supporting that API; speech controls remain available where highlighting is unsupported.
