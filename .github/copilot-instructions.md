# Local Quiz App - AI Agent Instructions

## Quick Start for AI Agents
1. **Run the app**: Use VS Code task "Run Local Quiz (server)" or execute `./run.ps1` (starts Python server on port 5173)
2. **Core files**: [app.js](../app.js) (all logic), [index.html](../index.html) (wrapper), [styles.css](../styles.css) (theming)
3. **Add quizzes**: Drop `.json` files in [quizzes/](../quizzes/) - they auto-appear in the dropdown
4. **Test changes**: Open browser console after loading quiz to inspect `state` object

## Project Overview
A vanilla JavaScript quiz application that runs entirely client-side in the browser. Zero external dependencies - just HTML, CSS, and JavaScript. Uses Python's HTTP server for local development to avoid CORS restrictions.

## Architecture

### Three-File Core
- **[index.html](../index.html)**: Minimal wrapper, loads CSS/JS
- **[app.js](../app.js)**: All quiz logic - state management, rendering, validation
- **[styles.css](../styles.css)**: Dark-themed gradient design with CSS variables

### State Management (app.js)
The app uses a single global `state` object (lines 7-16) that tracks:
- `questions`: normalized quiz data
- `order`: shuffled/original question sequence
- `answers`: user's responses (stored as original choice indices)
- `current`: active question index
- `shuffleQuestions` / `shuffleChoices`: user preferences

**Critical**: When `shuffleChoices` is enabled, answers are stored in ORIGINAL index space (0-3), not display index. The `buildChoiceMapping()` function (lines 570-591) creates deterministic per-question shuffles using a seeded PRNG.

### Quiz JSON Format
```json
[
  {
    "id": "optional_id",
    "question": "Question text",
    "choices": ["A", "B", "C", "D"],  // exactly 4 required
    "answerIndex": 0,  // 0-3, or use "answer": "A"
    "explanation": "Optional explanation"
  }
]
```

See [quizzes/sample-quiz.json](../quizzes/sample-quiz.json) for examples. Validation happens in `normalizedQuestions()` (lines 39-105) which converts `answer: "A"` to `answerIndex: 0`.

## Development Workflow

### Running Locally
Three methods (all start Python HTTP server on port 5173):
1. **Double-click [run.bat](../run.bat)** (Windows)
2. **PowerShell**: `./run.ps1`
3. **VS Code task**: "Run Local Quiz (server)"

The [run.ps1](../run.ps1) script:
- Auto-detects `python` or `py -3` command
- Starts server at `http://localhost:5173/`
- Opens browser automatically

### Adding New Quizzes
1. Create `.json` file in [quizzes/](../quizzes/) directory
2. **Auto-discovery**: Python's directory listing automatically shows new files (no manual registration needed)
3. **Optional**: Add entry to [quizzes/index.json](../quizzes/index.json) for custom display names:
   ```json
   { "name": "Week 5 - TypeScript", "file": "week5.json" }
   ```

The app merges both sources - discovered files get auto-generated names (see `nameFromFile()`, lines 302-311), but manifest entries override with prettier names.

### Quiz Content Conventions
Based on existing quiz files in [quizzes/](../quizzes/):
- Use descriptive `id` fields (e.g., `"html_1"`, `"css_2"`, `"http_3"`) for tracking
- Always provide `explanation` fields for wrong answers - helps learning
- Choices should be clear and unambiguous (avoid trick questions)
- Use consistent formatting: questions end with `?`, choices are sentence case
- Group related questions by topic using ID prefixes

## Key Implementation Patterns

### Render Functions
Three main screens, each rebuilds full DOM via `appEl.innerHTML`:
- `renderStartScreen()`: Quiz selection UI
- `renderQuestion()`: Active question with radio buttons
- `renderResults()`: Score and review

Always escape user content with `escapeHtml()` (lines 18-24) when injecting into HTML.

### Choice Shuffling Logic
- Uses deterministic seeded PRNG (`mulberry32()`, lines 664-672) so same question always shuffles identically
- Seed derived from question ID via `stringHash()` (lines 655-662)
- `displayToOriginal` array maps display position → original index
- Store answers in original index space to survive re-renders

### Quiz Discovery
Two mechanisms work together (lines 329-390):
1. **Manifest** (`quizzes/index.json`): Explicit list with custom names
2. **Auto-discovery**: Parse Python's HTML directory listing for `.json` files

Merge strategy: discovered files appear first, manifest entries override names. This allows "just drop a .json file" workflow while supporting curated lists.

## Testing Changes

### Test Quiz Loading
```javascript
// In browser console after loading app
state.questions // should show normalized questions
state.order     // should show question sequence
```

### Test Shuffle Determinism
Enable "Shuffle choices", answer a question, click Previous then Next. Choice order should remain stable (same question ID = same shuffle).

### Test File Protocol Fallback
Open `index.html` directly (no server). Quiz dropdown should show helpful error, but file upload should work.

## Common Tasks

### Modify Question Rendering
Edit `renderQuestion()` function (lines 450-545). The form uses radio buttons with `value="${originalIdx}"` - never use display index here.

### Change Styling
All colors/spacing use CSS variables in [styles.css](../styles.css) `:root` block (lines 1-15). The gradient background is defined on `body` (lines 22-26).

### Add New Quiz Metadata Field
1. Update TypeScript JSDoc typedef at line 5: `@typedef {{ ... }} QuizQuestion`
2. Handle in `normalizedQuestions()` validation (lines 39-105)
3. Display in relevant render function

### Modify Score Calculation
See `computeResults()` (lines 160-181). Returns object with `correctCount`, `wrongCount`, and per-question `results` array.

## Important Constraints

- **No build step**: Pure ES5+ JavaScript, no transpilation
- **No external libraries**: Vanilla DOM APIs only
- **File protocol support**: Must degrade gracefully when `file://` blocks fetches
- **Offline-first**: Everything runs client-side, no analytics/tracking

## File Conventions

- Quiz files: `quizzes/week{N}.json` naming pattern
- Scripts: PowerShell primary, batch as wrapper
- All paths in code use `/` separators (even on Windows)

## Troubleshooting Patterns

### Quiz Not Loading
- **Symptom**: Dropdown shows "Loading..." or "(list unavailable)"
- **Cause**: Usually file:// protocol blocking fetch calls
- **Fix**: Ensure Python HTTP server is running (`./run.ps1` or task "Run Local Quiz (server)")

### Shuffle Behavior Issues
- **Choice order changes**: This is expected - `mulberry32()` PRNG provides deterministic shuffles per question ID
- **Answers not persisting**: Check that `value="${originalIdx}"` is used in radio buttons (not display index)
- **Test**: Enable shuffle, answer question, click Previous/Next - order should stay stable

### New Quiz Not Appearing
- Click "Refresh list" button to re-scan `quizzes/` directory
- Verify `.json` extension (case-insensitive)
- Check browser console for validation errors from `normalizedQuestions()`
