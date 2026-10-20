# Past Exam Questions

Implemented on `feature/past-exam-questions`. No deployment or merge.

## Source and transcription

Source: `ECP172_Final Past-Paper Study Pack.pdf` (15 pages).

SHA-256: `9b3177dfc32aca50512283601dcb77526e311818187bb62438463948f0f48f46`.

`src/pastExamPack.json` was extracted from the PDF text and answer colours. Every source line was compared against the imported text, in order, ignoring whitespace and PDF line wrapping. Only the recurring page footer was excluded. Scenario wording, numbering, marks, source labels, cautions, inconsistencies and study notes are retained. The PDF's red text identifies model answers. A rendered source page was inspected to confirm formatting.

| Section | Questions |
| --- | ---: |
| Q1 | 10 |
| Q2 | 17 |
| Q3 | 10 |
| Q4 | 17 |

The added badges distinguish Original Past-Exam, Predicted and Practice. The original bracketed labels remain in each prompt. The data-collection assessment criterion converted to a study prompt is badged Practice and retains its full source qualification.

## Behaviour and preservation

The navigation and overview link open `#past-exams`. Q1–Q4 buttons show each section in source order. Answers start hidden and reveal as bold red text. Understanding and revision choices use only `ecp172-past-exam-questions-v1`. Existing learning storage, Q4 positions, countdown, reset/export behaviour and PWA configuration are unchanged. No external requests are needed for this section: its data and CSS are compiled into precached application assets.

## Verification

- `npm test`: 118 passed, including section labels and counts, reveal controls, rating persistence across remount, navigation, countdown presence and unchanged existing Q4/legacy progress.
- `npm run build`: TypeScript, Vite and PWA build passed; 19 precached assets.
- `git diff --check`: passed.
- Live browser visual/offline verification could not be completed: the browser connection reached an unrelated application at the default preview origin and timed out at the isolated origin. Responsive CSS is provided, but mobile layout and offline reload were not visually verified.
