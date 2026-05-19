# CSE 471 Study Lab

A repetition-first study platform for ASU's **CSE 471: Introduction to Artificial Intelligence**.

Five exams = 30% of the grade. This is built to drill the material until it sticks.

## What's inside

For each module:

- **Lessons** — material broken into bite-sized chunks that chain together
- **Flashcards** — Leitner box spaced-repetition (cards you miss come back sooner; mastered cards rest)
- **Multiple choice** — quiz mode with explanations on every answer
- **Free recall** — type from memory, get scored on key terms hit
- **Drag-and-drop matching** — for classification tasks (e.g. environment properties)
- **Review sheet** — the instructor's review questions with worked answers

All progress saves to `localStorage` so streaks survive across sessions.

## Stack

- HTML + CSS + vanilla JS (one file each)
- No build step, no npm install, no framework
- Drops straight into GitHub Pages
- Fonts via Google Fonts CDN (Fraunces + JetBrains Mono)

## Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g. `cse471-study`).
2. Push all the files in this folder to the repo root.
   ```bash
   git init
   git add .
   git commit -m "initial study lab"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/cse471-study.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source = "Deploy from a branch" → Branch = `main` / `(root)`** → Save.
4. Wait ~30 seconds. Your site is live at `https://YOUR-USERNAME.github.io/cse471-study/`.

## Add a new module (as the course progresses)

1. Open `data/course.json` and flip `"available": false` to `true` on the module you want to unlock.
2. Create `data/module-N.json` (where N matches the module number — e.g. `module-2.json` for Module 2). Use `data/module-1.json` as the template.

Each module file needs:

```jsonc
{
  "id": "m2",
  "title": "Module 2: Propositional Logic",
  "overview": "One paragraph high-level summary.",
  "lessons":      [ { "id": "l1", "title": "...", "summary": "...", "key_terms": ["..."] } ],
  "flashcards":   [ { "front": "...", "back": "..." } ],
  "quiz":         [ { "q": "...", "choices": ["...", "..."], "answer": 0, "explain": "..." } ],
  "free_recall":  [ { "prompt": "...", "accept": ["term1", "term2"], "ideal": "..." } ],
  "matching":     { "instructions": "...", "properties": [...], "environments": [...] },
  "review_sheet": [ { "q": "...", "a": "..." } ]
}
```

If a module doesn't need a matching game, just leave the section out and remove the link from the JS (or leave it — the matching tile only renders if the data is there).

## File structure

```
cse471-study/
├── index.html
├── css/style.css
├── js/app.js
├── data/
│   ├── course.json          ← unit/module index
│   └── module-1.json        ← module content
└── README.md
```

## Local preview

GitHub Pages works perfectly, but if you want to test locally:

```bash
# any static server works. Python's built-in:
python3 -m http.server 8000
# then visit http://localhost:8000
```

Just opening `index.html` directly in the browser won't work because of `fetch()` and the `file://` protocol — use a local server.

## License / notes

Built for personal study. The course content (lecture material, Poole & Mackworth textbook excerpts) belongs to ASU / the original authors.
