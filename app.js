/* Local Quiz app (no server). */

const appEl = document.getElementById('app');

/** @typedef {{ id?: string, question: string, choices: string[], answerIndex: number, explanation?: string }} QuizQuestion */

const state = {
  quizName: null,
  questions: /** @type {QuizQuestion[]} */ ([]),
  order: /** @type {number[]} */ ([]),
  answers: /** @type {(number|null)[]} */ ([]),
  current: 0,
  startedAt: null,
  endedAt: null,
  shuffleQuestions: false,
  shuffleChoices: false,
};

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function makeId(prefix = 'q') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function shuffleInPlace(array, rng = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalizedQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) {
    throw new Error('JSON root must be an array of questions.');
  }

  /** @type {QuizQuestion[]} */
  const out = [];

  rawQuestions.forEach((q, idx) => {
    if (q == null || typeof q !== 'object') {
      throw new Error(`Question #${idx + 1} is not an object.`);
    }

    const question = q.question;
    const choices = q.choices;

    if (typeof question !== 'string' || question.trim().length === 0) {
      throw new Error(`Question #${idx + 1} must have a non-empty "question" string.`);
    }

    if (!Array.isArray(choices) || choices.length !== 4) {
      throw new Error(`Question #${idx + 1} must have "choices" as an array of exactly 4 strings.`);
    }

    const choicesStr = choices.map((c, cIdx) => {
      if (typeof c !== 'string' || c.trim().length === 0) {
        throw new Error(`Question #${idx + 1}: choice #${cIdx + 1} must be a non-empty string.`);
      }
      return c;
    });

    let answerIndex = q.answerIndex;

    if (typeof answerIndex !== 'number' || !Number.isInteger(answerIndex)) {
      // allow "answer": "A"|"B"|"C"|"D" as a friendly alternative
      if (typeof q.answer === 'string') {
        const map = { A: 0, B: 1, C: 2, D: 3 };
        const key = q.answer.trim().toUpperCase();
        if (Object.prototype.hasOwnProperty.call(map, key)) {
          answerIndex = map[key];
        }
      }
    }

    if (typeof answerIndex !== 'number' || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      throw new Error(`Question #${idx + 1} must have "answerIndex" (0-3) or "answer" (A-D).`);
    }

    const explanation = typeof q.explanation === 'string' ? q.explanation : undefined;

    out.push({
      id: typeof q.id === 'string' && q.id.trim() ? q.id.trim() : makeId('q'),
      question,
      choices: choicesStr,
      answerIndex,
      explanation,
    });
  });

  if (out.length === 0) {
    throw new Error('Quiz has no questions.');
  }

  return out;
}

function resetSession() {
  state.order = [];
  state.answers = [];
  state.current = 0;
  state.startedAt = null;
  state.endedAt = null;
}

function setQuiz(questions, quizName) {
  state.questions = questions;
  state.quizName = quizName || 'Quiz';
  resetSession();
}

function startQuiz({ shuffleQuestions, shuffleChoices }) {
  state.shuffleQuestions = !!shuffleQuestions;
  state.shuffleChoices = !!shuffleChoices;
  state.order = [...state.questions.keys()];

  if (state.shuffleQuestions) {
    shuffleInPlace(state.order);
  }

  state.answers = new Array(state.order.length).fill(null);
  state.current = 0;
  state.startedAt = new Date();
  state.endedAt = null;

  renderQuestion();
}

function startQuizWithOrder(order, { shuffleQuestions, shuffleChoices }) {
  state.shuffleQuestions = !!shuffleQuestions;
  state.shuffleChoices = !!shuffleChoices;
  state.order = Array.isArray(order) ? [...order] : [];

  if (state.shuffleQuestions) {
    shuffleInPlace(state.order);
  }

  state.answers = new Array(state.order.length).fill(null);
  state.current = 0;
  state.startedAt = new Date();
  state.endedAt = null;

  renderQuestion();
}

function currentQuestion() {
  const originalIndex = state.order[state.current];
  return { originalIndex, q: state.questions[originalIndex] };
}

function computeResults() {
  const results = state.order.map((originalIndex, i) => {
    const q = state.questions[originalIndex];
    const selected = state.answers[i];
    const correct = q.answerIndex;
    const isCorrect = selected === correct;
    return {
      originalIndex,
      questionId: q.id,
      question: q.question,
      choices: q.choices,
      selected,
      correct,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const correctCount = results.filter(r => r.isCorrect).length;
  return {
    total: results.length,
    correctCount,
    wrongCount: results.length - correctCount,
    results,
  };
}

function renderStartScreen(errorMsg) {
  const example = `[
  {
    "question": "What is 2 + 2?",
    "choices": ["3", "4", "5", "22"],
    "answerIndex": 1,
    "explanation": "2 + 2 = 4"
  }
]`;

  appEl.innerHTML = `
    <div class="row">
      <div>
        <div class="badge">Step 1</div>
        <h2 style="margin:8px 0 4px;">Load your quiz JSON</h2>
        <div class="muted" style="max-width: 70ch;">
          The JSON must be an array of questions. Each question needs a <code>question</code>,
          exactly 4 <code>choices</code>, and a correct answer (<code>answerIndex</code> 0-3 or <code>answer</code> A-D).
        </div>
      </div>
      <div class="spacer"></div>
      <button id="loadSample" class="primary" type="button">Load sample quiz</button>
    </div>

    ${errorMsg ? `<div class="error" style="margin-top:12px;">${escapeHtml(errorMsg)}</div>` : ''}

    <hr />

    <div class="row" style="align-items:flex-start;">
      <div style="flex:1; min-width: 280px;">
        <div class="muted" style="margin-bottom: 6px;">Choose a quiz (from <code>quizzes/</code>)</div>
        <select id="quizSelect" style="width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: rgba(0,0,0,0.12); color: var(--text);">
          <option value="" selected>Loading…</option>
        </select>
        <div id="quizStatus" class="muted" style="margin-top: 8px; font-size: 13px;"></div>

        <div class="row" style="margin-top: 10px;">
          <button id="loadSelected" type="button" disabled>Load selected</button>
          <button id="refreshList" type="button">Refresh list</button>
        </div>

        <details style="margin-top:12px;">
          <summary class="muted">Or upload a JSON file</summary>
          <div style="margin-top:10px;">
            <input id="fileInput" type="file" accept="application/json,.json" />
            <div class="muted" style="margin-top: 8px; font-size: 13px;">Your file never leaves your computer.</div>
          </div>
        </details>
      </div>

      <div style="flex:1; min-width: 280px;">
        <label class="checkbox"><input id="shuffleQ" type="checkbox" /> Shuffle questions</label>
        <label class="checkbox" style="margin-top:10px;"><input id="shuffleC" type="checkbox" /> Shuffle choices (optional)</label>
        <div class="muted" style="margin-top: 8px; font-size: 13px;">If you shuffle choices, answers are kept correct.</div>
      </div>
    </div>

    <hr />

    <div class="row">
      <button id="startBtn" class="primary" type="button" disabled>Start quiz</button>
      <div class="muted">Tip: check <code>quizzes/sample-quiz.json</code> to see the format.</div>
    </div>

    <details style="margin-top:12px;">
      <summary class="muted">Show JSON format example</summary>
      <pre class="card" style="margin-top:10px; overflow:auto;">${escapeHtml(example)}</pre>
    </details>
  `;

  const fileInput = document.getElementById('fileInput');
  const startBtn = document.getElementById('startBtn');
  const shuffleQ = document.getElementById('shuffleQ');
  const shuffleC = document.getElementById('shuffleC');
  const quizSelect = document.getElementById('quizSelect');
  const quizStatus = document.getElementById('quizStatus');
  const loadSelected = document.getElementById('loadSelected');
  const refreshList = document.getElementById('refreshList');

  if (location && location.protocol === 'file:') {
    if (quizStatus) {
      quizStatus.textContent = 'Quiz dropdown requires a local server (because browsers block folder reads on file://). Use run.bat / run.ps1, or upload a JSON file below.';
    }
  }

  const loadSample = document.getElementById('loadSample');
  loadSample.addEventListener('click', async () => {
    try {
      const res = await fetch('./quizzes/sample-quiz.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load quizzes/sample-quiz.json');
      const json = await res.json();
      const qs = normalizedQuestions(json);
      setQuiz(qs, 'Sample Quiz');
      startBtn.disabled = false;
      startBtn.focus();
    } catch (e) {
      renderStartScreen(
        `Could not load sample via fetch (common on file://). Please use the file picker or run a local server. Details: ${e?.message || e}`
      );
    }
  });

  function nameFromFile(file) {
    const base = String(file).split('/').pop() || String(file);
    const noExt = base.replace(/\.json$/i, '');
    return noExt
      .replaceAll('_', ' ')
      .replaceAll('-', ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^./, (c) => c.toUpperCase()) || base;
  }

  async function discoverQuizzesFromDirectoryListing() {
    const res = await fetch('./quizzes/', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not fetch quizzes/ directory listing');
    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'))
      .map(a => (a.getAttribute('href') || '').trim())
      .filter(Boolean);

    const jsonFiles = links
      .filter(href => href.toLowerCase().endsWith('.json'))
      .filter(href => !href.toLowerCase().includes('index.json'))
      .map(href => href.replace(/^\.\//, ''));

    // Python http.server lists as relative names like "sample-quiz.json".
    const uniq = Array.from(new Set(jsonFiles));
    return uniq.map(file => ({ name: nameFromFile(file), file }));
  }

  async function loadQuizList() {
    if (!quizSelect || !quizStatus || !loadSelected) return;

    loadSelected.disabled = true;
    quizSelect.innerHTML = `<option value="" selected>Loading…</option>`;
    quizStatus.textContent = '';

    try {
      /** @type {{name: string, file: string}[]} */
      let manifestItems = [];
      /** @type {{name: string, file: string}[]} */
      let discoveredItems = [];

      // Optional: explicit manifest (lets you control display names)
      try {
        const res = await fetch('./quizzes/index.json', { cache: 'no-store' });
        if (res.ok) {
          const manifest = await res.json();
          if (Array.isArray(manifest)) {
            manifestItems = manifest
              .filter(x => x && typeof x === 'object')
              .map((x) => ({
                name: typeof x.name === 'string' ? x.name : null,
                file: typeof x.file === 'string' ? x.file : (typeof x.path === 'string' ? x.path : null),
              }))
              .filter(x => x.file)
              .map(x => ({
                file: x.file,
                name: x.name || nameFromFile(x.file),
              }));
          }
        }
      } catch {
        // ignore
      }

      // Preferred for convenience: auto-discover from directory listing (works with Python http.server)
      // We do this even if the manifest exists, so new files show up automatically.
      try {
        discoveredItems = await discoverQuizzesFromDirectoryListing();
      } catch {
        discoveredItems = [];
      }

      // Merge by file (manifest name wins)
      const byFile = new Map();
      for (const it of discoveredItems) {
        if (!it?.file) continue;
        byFile.set(it.file, { file: it.file, name: it.name || nameFromFile(it.file) });
      }
      for (const it of manifestItems) {
        if (!it?.file) continue;
        byFile.set(it.file, { file: it.file, name: it.name || nameFromFile(it.file) });
      }

      const items = Array.from(byFile.values())
        .filter(it => it.file.toLowerCase().endsWith('.json'))
        .filter(it => it.file.toLowerCase() !== 'index.json')
        .sort((a, b) => a.name.localeCompare(b.name));

      if (items.length === 0) {
        quizSelect.innerHTML = `<option value="" selected>(no quizzes listed)</option>`;
        quizStatus.textContent = 'No quizzes found in quizzes/. Add .json files there.';
        return;
      }

      quizSelect.innerHTML = items
        .map((it, i) => `<option value="${escapeHtml(it.file)}" ${i === 0 ? 'selected' : ''}>${escapeHtml(it.name)}</option>`)
        .join('');

      quizStatus.textContent = `Found ${items.length} quiz(es).`;
      loadSelected.disabled = false;
    } catch (e) {
      quizSelect.innerHTML = `<option value="" selected>(list unavailable)</option>`;
      quizStatus.textContent = 'Could not load quiz list. Use the file picker or run a local server (python http.server recommended).';
    }
  }

  if (refreshList) {
    refreshList.addEventListener('click', () => {
      loadQuizList();
    });
  }

  if (loadSelected && quizSelect) loadSelected.addEventListener('click', async () => {
    const file = quizSelect.value;
    if (!file) return;
    const safePath = file.replace(/^\/+/, '');
    const url = safePath.startsWith('quizzes/') || safePath.startsWith('./quizzes/')
      ? safePath
      : `./quizzes/${safePath}`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      const json = await res.json();
      const qs = normalizedQuestions(json);
      const quizName = quizSelect.options[quizSelect.selectedIndex]?.textContent || 'Quiz';
      setQuiz(qs, quizName);
      startBtn.disabled = false;
      startBtn.focus();
    } catch (e) {
      renderStartScreen(e?.message || String(e));
    }
  });

  // kick off quiz list load
  loadQuizList();

  if (fileInput) fileInput.addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const qs = normalizedQuestions(json);
      setQuiz(qs, file.name.replace(/\.json$/i, ''));
      startBtn.disabled = false;
    } catch (e) {
      startBtn.disabled = true;
      renderStartScreen(e?.message || String(e));
    }
  });

  startBtn.addEventListener('click', () => {
    if (!state.questions.length) return;
    startQuiz({ shuffleQuestions: shuffleQ.checked, shuffleChoices: shuffleC.checked });
  });
}

function renderQuestion() {
  const { q } = currentQuestion();
  const position = state.current + 1;
  const total = state.order.length;
  const selected = state.answers[state.current];

  // Optionally shuffle choices per question while preserving correct mapping.
  // We do this by building a display mapping each time we render, but keep the
  // stored answer in "display index" space for the current render.
  // For simplicity: if shuffleChoices is on, we compute a stable shuffle per question id.

  const mapping = buildChoiceMapping(q);
  const displayChoices = mapping.displayChoices;
  const displayCorrectIndex = mapping.displayCorrectIndex;

  // If previously answered under a different mapping, we can’t safely reuse it.
  // So when shuffleChoices is enabled, we store answers in ORIGINAL index space.
  // That avoids mismatch.
  const selectedOriginalIndex = selected;

  appEl.innerHTML = `
    <div class="row">
      <div class="progress">${escapeHtml(state.quizName || 'Quiz')} • Question ${position} / ${total}</div>
      <div class="spacer"></div>
      <button id="endBtn" class="danger" type="button">End</button>
    </div>

    <div class="question">${escapeHtml(q.question)}</div>

    <form id="choiceForm" class="choices">
      ${displayChoices
        .map((choiceText, displayIdx) => {
          const originalIdx = mapping.displayToOriginal[displayIdx];
          const checked = selectedOriginalIndex === originalIdx;
          return `
            <label class="choice">
              <input type="radio" name="choice" value="${originalIdx}" ${checked ? 'checked' : ''} />
              <div class="label">
                <div><b>${String.fromCharCode(65 + displayIdx)}.</b> ${escapeHtml(choiceText)}</div>
              </div>
            </label>
          `;
        })
        .join('')}
    </form>

    <div class="row">
      <button id="prevBtn" type="button" ${state.current === 0 ? 'disabled' : ''}>Previous</button>
      <button id="nextBtn" class="primary" type="button">${state.current === total - 1 ? 'Finish' : 'Next'}</button>
      <div class="spacer"></div>
      <span class="muted">Selected: <code id="selectedLabel">${selectedOriginalIndex == null ? '-' : labelForOriginalIndex(mapping, selectedOriginalIndex)}</code></span>
    </div>

    <div class="muted" style="margin-top: 10px; font-size: 13px;">
      Answer is saved when you click Next/Finish.
    </div>
  `;

  const form = document.getElementById('choiceForm');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const endBtn = document.getElementById('endBtn');

  const selectedLabel = document.getElementById('selectedLabel');

  form.addEventListener('change', () => {
    const picked = getPickedOriginalIndex();
    selectedLabel.textContent = picked == null ? '-' : labelForOriginalIndex(mapping, picked);
  });

  prevBtn.addEventListener('click', () => {
    persistSelection();
    state.current = Math.max(0, state.current - 1);
    renderQuestion();
  });

  nextBtn.addEventListener('click', () => {
    persistSelection();
    if (state.current === total - 1) {
      endQuiz();
    } else {
      state.current += 1;
      renderQuestion();
    }
  });

  endBtn.addEventListener('click', () => {
    persistSelection();
    endQuiz();
  });

  function getPickedOriginalIndex() {
    const checked = form.querySelector('input[name="choice"]:checked');
    if (!checked) return null;
    const val = Number(checked.value);
    return Number.isInteger(val) ? val : null;
  }

  function persistSelection() {
    const picked = getPickedOriginalIndex();
    state.answers[state.current] = picked;
  }
}

function buildChoiceMapping(q) {
  const displayToOriginal = [0, 1, 2, 3];

  if (state.shuffleChoices) {
    // deterministic-ish shuffle based on id string
    const seed = stringHash(q.id || q.question);
    const rng = mulberry32(seed);
    shuffleInPlace(displayToOriginal, rng);
  }

  const originalToDisplay = new Map();
  displayToOriginal.forEach((orig, display) => originalToDisplay.set(orig, display));

  const displayChoices = displayToOriginal.map(origIdx => q.choices[origIdx]);
  const displayCorrectIndex = originalToDisplay.get(q.answerIndex);

  return {
    displayToOriginal,
    displayChoices,
    displayCorrectIndex,
  };
}

function labelForOriginalIndex(mapping, originalIdx) {
  const displayIdx = mapping.displayToOriginal.indexOf(originalIdx);
  if (displayIdx < 0) return '?';
  return String.fromCharCode(65 + displayIdx);
}

function endQuiz() {
  state.endedAt = new Date();
  renderResults();
}

function renderResults() {
  const { total, correctCount, wrongCount, results } = computeResults();
  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  const wrongOrder = results
    .filter(r => !r.isCorrect)
    .map(r => r.originalIndex);
  const canRetryWrong = wrongOrder.length > 0;

  appEl.innerHTML = `
    <div class="row">
      <div>
        <div class="badge">Results</div>
        <h2 style="margin:8px 0 4px;">${escapeHtml(state.quizName || 'Quiz')} — Score</h2>
        <div class="muted">You can review every question below.</div>
      </div>
      <div class="spacer"></div>
      <button id="restartBtn" class="primary" type="button">Restart</button>
      <button id="retryWrongBtn" type="button" ${canRetryWrong ? '' : 'disabled'}>Retry wrong</button>
      <button id="newBtn" type="button">Load new JSON</button>
    </div>

    <hr />

    <div class="kpi">
      <div class="pill ok">Correct: ${correctCount}</div>
      <div class="pill bad">Wrong: ${wrongCount}</div>
      <div class="pill">Total: ${total}</div>
      <div class="pill">Percent: ${pct}%</div>
    </div>

    <div class="review" id="review"></div>
  `;

  const reviewEl = document.getElementById('review');
  reviewEl.innerHTML = results
    .map((r, i) => {
      const status = r.isCorrect ? 'ok' : 'bad';
      const statusText = r.isCorrect ? 'Correct' : 'Wrong';
      const selectedText = r.selected == null ? '(no answer)' : r.choices[r.selected];
      const correctText = r.choices[r.correct];

      return `
        <div class="reviewItem">
          <div class="top">
            <span class="qno">Q${i + 1}</span>
            <span class="status ${status}">${statusText}</span>
          </div>
          <div class="question" style="margin:8px 0 6px; font-size: 16px;">${escapeHtml(r.question)}</div>
          <div class="answers">
            <div><b>Your answer:</b> ${escapeHtml(selectedText)}</div>
            <div><b>Correct answer:</b> ${escapeHtml(correctText)}</div>
            ${r.explanation ? `<div style="margin-top:6px;"><b>Explanation:</b> ${escapeHtml(r.explanation)}</div>` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  document.getElementById('restartBtn').addEventListener('click', () => {
    startQuiz({ shuffleQuestions: state.shuffleQuestions, shuffleChoices: state.shuffleChoices });
  });

  const retryWrongBtn = document.getElementById('retryWrongBtn');
  if (retryWrongBtn) retryWrongBtn.addEventListener('click', () => {
    if (!canRetryWrong) return;
    startQuizWithOrder(wrongOrder, { shuffleQuestions: state.shuffleQuestions, shuffleChoices: state.shuffleChoices });
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    state.questions = [];
    state.quizName = null;
    resetSession();
    renderStartScreen();
  });
}

// Deterministic PRNG helpers (for choice shuffle)
function stringHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Boot
renderStartScreen();
