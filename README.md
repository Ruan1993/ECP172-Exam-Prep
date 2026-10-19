# ECP172 Learn First (2026)

A calm, sequential study-book PWA based on the 13-page ECP172 Learn First guide.

## What changed

- Replaced mock exams, XP, answer builder, daily challenges, recall quizzes and repetitive practice modes with four ordered chapters.
- Each chapter moves from explanation to full worked answers. Source paragraphs from the approved guide are retained in `src/guide.json`.
- Existing learning-card choices and bookmarks persist locally. **Flashcards** replaces Revise Later with filtered, randomly shuffled decks, manual flips and automatic Listen sessions, without ratings or scores.
- Remembers the last card in each chapter; progress can be backed up and restored as a JSON file.
- Dark mode, installable PWA, offline assets and update controls are preserved.

## Getting started

```bash
npm ci
npm run dev
```

For production: `npm run build`. Run checks with `npm test`.

## Content basis

The study material comes from **ECP172 Complete Learn First Study Guide** (21 October 2026). The two original research cases are (A) language barriers in Grade 8 Social Sciences, using qualitative case study, and (B) cyberbullying, using explanatory sequential mixed methods. The guide's first proposal heading mentions literacy/numeracy, but its actual research title and contents focus on language barriers, so this app avoids that inaccurate description. Worked cases are illustrative rather than official memoranda.

## Flashcard content audit

[The content audit](FLASHCARD_CONTENT_AUDIT.md) records all 109 cards, course-source evidence and verified corrections against the final lecturer-focused notes. Full prior revision explanations remain available.

## Data safety

New reading choices are stored at `ecp172-learn-first-v1`. The previous app's `ecp172-progress-v1` entry is **not changed or deleted**, since activity completion cannot reliably be converted into an understanding rating. New reading progress starts fresh. Previous revision ratings are retained in backups but do not affect Flashcards or their order. Flashcards does not write learning progress. Export/import backups from the **Backup** menu. No cloud sync is implemented.

## Deployment

Deploy from the repository using your existing Vite/Vercel integration. The PWA's service worker will prompt for an update when a new release is available. The installability and offline route remain configured in `vite.config.ts`.
