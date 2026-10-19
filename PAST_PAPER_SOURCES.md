# Past-paper panel source audit

Audit date: 19 October 2026.

## Available material

- `src/data.ts`, `scenarios`: four adapted historical study summaries (`s-bela`, `s-cyber`, `s-lolt`, `s-multi`). Their existing source labels claim 2025 Semester 2 ECP172-FIS Q1/Q2/Q3 and 2025 Semester 1 Main Examination Q3. These claims and the question-part marks are not verified against original papers.
- `src/guide.json` and `src/guidedData.ts`: current instructional material and illustrative worked examples, not original papers.
- Local ignored `tmp/pdfs/exam-notes.txt`: extracted 2026 focused notes; pages 1–2 support the final examination format and structured responses. This file is not an original past paper. Its name should not be interpreted as evidence that the original PDF exists here.
- Local `tmp/pdfs/` also contains two PNG images, not complete original past papers.

## Missing evidence and display policy

No original examination PDF, scan, Word document, or record verifying exact historical question wording was found in the repository. No historical Q4 question summary is supplied. Original wording, historical year/paper/question numbering and marks are therefore omitted from the new panels. The panel explicitly says “Past-paper question summary” and explains the missing verification. The 2026 25-mark allocation is separately labelled as current preparation guidance.

The four new summaries paraphrase only the existing historical study summaries. They do not present quotation marks, historical allocations or paper identities as verified. Historical essay tasks are translated into structured-answer preparation; the 2026 format remains four compulsory 25-mark questions, no essays, Q1–Q3 scenario/issue based and Q4 theory based.

Panels are placed on the BELA, cyberbullying, LiEP/LAC and SIAS cards in the current reading journey and matching retained Guided Learning topics. No Q4 historical panel is fabricated. Disclosure state is local, collapsed on entry, keyed by the current card and never persisted into learning progress. Expanded content uses the existing shared Read Aloud component. The current reading-card toolbar can also include the panel when expanded before reading starts.

Publication is authorised for the four summary-only comparisons. The expandable label is “Show past-paper question”; expanded content remains labelled “Past-paper question summary”. Original wording and historical metadata remain unverified and omitted. Publishing these summaries does not establish source-paper verification.

## Verification

- `npm test`: all 43 tests pass, including four source-label, 2026-format, topic-placement and disclosure/reading integration checks.
- `npm run build`: TypeScript, Vite and PWA production build succeed.
- Browser: all four summary topics checked in the current reading journey; no historical Q4 panel appears. Keyboard Enter expands/collapses the disclosure; reading starts through the shared controller and stops when the panel closes. Leaving and returning to a card resets the panel to collapsed. No browser console errors observed.
- Expanded mobile layout checked at 320, 360, 390 and 430 pixels with no horizontal page overflow. Dark mode visually inspected.
- Legacy Guided Learning integration compiles and its topic mappings are checked automatically; its removed routes were not restored for browser testing.
