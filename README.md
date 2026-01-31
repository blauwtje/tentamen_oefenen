# Local Quiz (JSON)

A tiny static quiz app that runs locally in your browser.

## Run

### Easiest

- Double-click `run.bat` (Windows)
  - This starts the local server and opens the browser.

### PowerShell

- Run `./run.ps1`

### VS Code Task

- Run the task **Run Local Quiz (server)**

### Manual

- Run `python -m http.server 5173` in this folder
- Open `http://localhost:5173/`

Then pick a quiz from the dropdown (reads from `quizzes/index.json`) or upload your own `.json` via the file picker.

If loading quizzes from the folder is blocked, run a local server (recommended).

## JSON format

Top-level must be an array of questions.

Each question:

- `question`: string
- `choices`: array of exactly 4 strings
- Correct answer as either:
  - `answerIndex`: number (0-3)
  - OR `answer`: string ("A"/"B"/"C"/"D")
- Optional: `explanation`: string
- Optional: `id`: string

Example:

```json
[
  {
    "question": "What is 2 + 2?",
    "choices": ["3", "4", "5", "22"],
    "answerIndex": 1,
    "explanation": "2 + 2 = 4"
  }
]
```

## Multiple quizzes (folder)

Put quizzes in the `quizzes/` folder, then list them in `quizzes/index.json`.

`quizzes/index.json` format:

```json
[
  { "name": "My Quiz 1", "file": "my-quiz-1.json" },
  { "name": "Chapter 2", "file": "chapter-2.json" }
]
```

Then refresh the page (or click **Refresh list**) and choose the quiz.

## Notes

- Everything runs locally; your data never leaves your machine.
- There’s an option to shuffle questions and/or choices.
