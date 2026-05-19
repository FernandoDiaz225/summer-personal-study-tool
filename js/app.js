/* ===================================================
   CSE 471 Study — main script
   Plain ES modules-free JS. Hash-based routing.
   =================================================== */

// ---------- storage ----------
const STORE_KEY = 'cse471-study-v1';

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}

function saveStore(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

function getProgress(moduleId) {
  const s = loadStore();
  return s[moduleId] || { leitner: {}, quizScores: [], lastVisited: null };
}

function setProgress(moduleId, patch) {
  const s = loadStore();
  s[moduleId] = { ...getProgress(moduleId), ...patch };
  saveStore(s);
}

// ---------- routing ----------
function parseHash() {
  const h = (location.hash || '#/').replace(/^#/, '');
  const parts = h.split('/').filter(Boolean);
  // routes:  /                  -> home
  //          /m1                 -> module page
  //          /m1/flashcards      -> mode
  //          /m1/quiz
  //          /m1/recall
  //          /m1/match
  //          /m1/review
  //          /m1/overview
  return { moduleId: parts[0] || null, mode: parts[1] || null };
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

// ---------- data loading ----------
let COURSE = null;
const MODULE_CACHE = {};

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function ensureCourse() {
  if (!COURSE) COURSE = await fetchJSON('./data/course.json');
  return COURSE;
}

async function loadModule(id) {
  if (MODULE_CACHE[id]) return MODULE_CACHE[id];
  try {
    const data = await fetchJSON(`./data/module-${id.replace('m', '')}.json`);
    MODULE_CACHE[id] = data;
    return data;
  } catch (e) {
    return null;
  }
}

// ---------- render dispatch ----------
async function render() {
  const root = document.getElementById('app');
  root.innerHTML = '<div class="empty-state">Loading…</div>';
  const { moduleId, mode } = parseHash();
  await ensureCourse();
  if (!moduleId) return renderHome(root);
  const mod = await loadModule(moduleId);
  if (!mod) return renderStub(root, moduleId);
  if (!mode) return renderModule(root, mod);
  switch (mode) {
    case 'overview':    return renderOverview(root, mod);
    case 'flashcards':  return renderFlashcards(root, mod);
    case 'quiz':        return renderQuiz(root, mod);
    case 'recall':      return renderRecall(root, mod);
    case 'match':       return renderMatch(root, mod);
    case 'review':      return renderReview(root, mod);
    default:            return renderModule(root, mod);
  }
}

// ---------- crumbs helper ----------
function crumbs(moduleTitle, modeName) {
  const parts = [`<a href="#/">Home</a>`];
  if (moduleTitle) parts.push(`<span>${escapeHTML(moduleTitle)}</span>`);
  if (modeName) parts.push(`<span>${modeName}</span>`);
  return `<nav class="crumbs">${parts.join('<span class="sep">/</span>')}</nav>`;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ====================================================
// HOME PAGE
// ====================================================
function renderHome(root) {
  const html = `
    <h1><span class="num">CSE471</span>Study Lab</h1>
    <p class="lede">A repetition-first study tool for CSE 471: Introduction to Artificial Intelligence. Pick a module, then drill the material five different ways until it sticks.</p>

    <div class="spacer-md"></div>

    ${COURSE.units.map(unit => `
      <section class="unit">
        <div class="unit-head">
          <div class="unit-title">${escapeHTML(unit.title)}</div>
          ${unit.exam ? `<div class="unit-exam">⚐ ${escapeHTML(unit.exam)}</div>` : ''}
        </div>
        <div class="modules">
          ${unit.modules.map(m => {
            const cls = m.available ? 'module-card available' : 'module-card locked';
            const href = m.available ? `#/${m.id}` : 'javascript:void(0)';
            const statusLabel = m.available ? 'Ready ✓' : 'Coming soon';
            const onclick = m.available ? '' : `onclick="event.preventDefault()"`;
            return `
              <a class="${cls}" href="${href}" ${onclick}>
                <div class="module-status">${statusLabel}</div>
                <div class="module-id">${escapeHTML(m.id.toUpperCase())}</div>
                <div class="module-name">${escapeHTML(m.title.replace(/^Module \d+:?\s*/, ''))}</div>
              </a>
            `;
          }).join('')}
        </div>
      </section>
    `).join('')}
  `;
  root.innerHTML = html;
}

// ====================================================
// STUB FOR LOCKED MODULES
// ====================================================
function renderStub(root, id) {
  root.innerHTML = `
    ${crumbs(id.toUpperCase(), null)}
    <h1>${escapeHTML(id.toUpperCase())}</h1>
    <p class="lede">This module isn't built out yet. Drop a <code>data/module-N.json</code> file in the same shape as Module 1 and it'll show up automatically.</p>
    <p><a class="btn" href="#/">← Back to home</a></p>
  `;
}

// ====================================================
// MODULE LANDING PAGE
// ====================================================
function renderModule(root, mod) {
  const prog = getProgress(mod.id);
  const fcLen = mod.flashcards?.length || 0;
  const knownCount = Object.values(prog.leitner || {}).filter(b => b >= 4).length;
  const bestQuiz = prog.quizScores?.length ? Math.max(...prog.quizScores) : null;

  root.innerHTML = `
    ${crumbs(mod.title, null)}
    <h1>${escapeHTML(mod.title)}</h1>
    <p class="lede">${escapeHTML(mod.overview)}</p>

    <div class="mode-picker">
      <a class="mode-btn" href="#/${mod.id}/overview">
        <div class="mode-label">01 · Read</div>
        <div class="mode-name">Lessons</div>
        <div class="mode-desc">${mod.lessons.length} bite-sized chunks. Start here for first pass.</div>
      </a>
      <a class="mode-btn" href="#/${mod.id}/flashcards">
        <div class="mode-label">02 · Drill</div>
        <div class="mode-name">Flashcards</div>
        <div class="mode-desc">${fcLen} cards · spaced repetition · ${knownCount} mastered</div>
      </a>
      <a class="mode-btn" href="#/${mod.id}/quiz">
        <div class="mode-label">03 · Test</div>
        <div class="mode-name">Multiple Choice</div>
        <div class="mode-desc">${mod.quiz.length} questions${bestQuiz !== null ? ` · best: ${bestQuiz}/${mod.quiz.length}` : ''}</div>
      </a>
      <a class="mode-btn" href="#/${mod.id}/recall">
        <div class="mode-label">04 · Recall</div>
        <div class="mode-name">Free Recall</div>
        <div class="mode-desc">Type answers from memory. ${mod.free_recall.length} prompts.</div>
      </a>
      <a class="mode-btn" href="#/${mod.id}/match">
        <div class="mode-label">05 · Classify</div>
        <div class="mode-name">Drag-and-Drop Match</div>
        <div class="mode-desc">Pin properties to environments.</div>
      </a>
      <a class="mode-btn" href="#/${mod.id}/review">
        <div class="mode-label">06 · Cement</div>
        <div class="mode-name">Review Sheet</div>
        <div class="mode-desc">The instructor's review questions, answered.</div>
      </a>
    </div>

    <div class="row">
      <a class="btn" href="#/">← All modules</a>
      <button class="btn bad" onclick="resetProgress('${mod.id}')">Reset progress</button>
    </div>
  `;
}

window.resetProgress = function(modId) {
  if (!confirm('Clear all flashcard and quiz progress for this module?')) return;
  const s = loadStore();
  delete s[modId];
  saveStore(s);
  render();
};

// ====================================================
// OVERVIEW (lessons)
// ====================================================
function renderOverview(root, mod) {
  root.innerHTML = `
    ${crumbs(mod.title, 'Lessons')}
    <h1>Lessons</h1>
    <p class="lede">${escapeHTML(mod.overview)}</p>
    ${mod.lessons.map(l => `
      <div class="lesson">
        <h4>${escapeHTML(l.title)}</h4>
        <p>${escapeHTML(l.summary)}</p>
        <div class="terms">${l.key_terms.map(t => `<span class="term-chip">${escapeHTML(t)}</span>`).join('')}</div>
      </div>
    `).join('')}
    <div class="row"><a class="btn accent" href="#/${mod.id}/flashcards">Drill these → Flashcards</a></div>
  `;
}

// ====================================================
// FLASHCARDS (Leitner box system — 5 boxes)
// Box 1 = miss often, Box 5 = mastered.
// Wrong answer → drop to Box 1
// Right answer → promote +1
// Session draws preferentially from lower boxes.
// ====================================================
function renderFlashcards(root, mod) {
  const prog = getProgress(mod.id);
  let leitner = { ...(prog.leitner || {}) };
  mod.flashcards.forEach((_, i) => { if (leitner[i] == null) leitner[i] = 1; });

  // build session queue: weighted by inverse box level
  function buildQueue() {
    const pool = mod.flashcards.map((_, i) => i);
    // sort by box (low first), then random within
    pool.sort((a, b) => (leitner[a] - leitner[b]) || (Math.random() - 0.5));
    return pool;
  }

  let queue = buildQueue();
  let qIdx = 0;
  let flipped = false;
  let sessionRight = 0;
  let sessionWrong = 0;

  function paint() {
    const cardIdx = queue[qIdx];
    const card = mod.flashcards[cardIdx];
    const mastered = Object.values(leitner).filter(b => b >= 4).length;
    const box = leitner[cardIdx];

    root.innerHTML = `
      ${crumbs(mod.title, 'Flashcards')}
      <h1>Flashcards</h1>

      <div class="fc-stage">
        <div class="fc-progress">
          <span class="pill">Card ${qIdx + 1} / ${queue.length}</span>
          <span class="pill">Box ${box}/5</span>
          <span class="pill">Mastered ${mastered}/${mod.flashcards.length}</span>
          <span class="pill">Session ${sessionRight}✓ ${sessionWrong}✗</span>
        </div>

        <div class="fc-card${flipped ? ' flipped' : ''}" id="fc-card">
          <div class="fc-inner">
            <div class="fc-front">
              <span class="label">Question · click to flip</span>
              <div class="text">${escapeHTML(card.front)}</div>
            </div>
            <div class="fc-back">
              <span class="label">Answer</span>
              <div class="text">${escapeHTML(card.back)}</div>
            </div>
          </div>
        </div>

        <div class="fc-actions">
          ${!flipped
            ? `<button class="btn" id="flip-btn">Flip card</button>`
            : `<button class="btn bad" id="miss-btn">✗ Got it wrong</button>
               <button class="btn good" id="hit-btn">✓ Got it right</button>`
          }
        </div>
        <div class="muted mono" style="font-size:0.75rem;">${qIdx + 1 === queue.length ? 'Last card in this session.' : ''}</div>
      </div>

      <div class="row">
        <a class="btn" href="#/${mod.id}">← Back to module</a>
        <button class="btn" onclick="(${resetLeitner.toString()})('${mod.id}')">Reset card progress</button>
      </div>
    `;

    document.getElementById('fc-card').onclick = () => {
      if (!flipped) { flipped = true; paint(); }
    };
    const flipBtn = document.getElementById('flip-btn');
    if (flipBtn) flipBtn.onclick = (e) => { e.stopPropagation(); flipped = true; paint(); };
    const hitBtn = document.getElementById('hit-btn');
    const missBtn = document.getElementById('miss-btn');
    if (hitBtn) hitBtn.onclick = (e) => { e.stopPropagation(); answer(true); };
    if (missBtn) missBtn.onclick = (e) => { e.stopPropagation(); answer(false); };
  }

  function answer(correct) {
    const cardIdx = queue[qIdx];
    if (correct) {
      leitner[cardIdx] = Math.min(5, leitner[cardIdx] + 1);
      sessionRight++;
    } else {
      leitner[cardIdx] = 1;
      sessionWrong++;
    }
    setProgress(mod.id, { leitner });
    flipped = false;
    qIdx++;
    if (qIdx >= queue.length) {
      // session complete
      const mastered = Object.values(leitner).filter(b => b >= 4).length;
      root.innerHTML = `
        ${crumbs(mod.title, 'Flashcards')}
        <h1>Session complete</h1>
        <div class="score-banner">
          <div class="big">${sessionRight}/${queue.length}</div>
          <div class="label">Correct this session</div>
        </div>
        <p class="center muted">Total mastered: ${mastered}/${mod.flashcards.length} (Box 4+)</p>
        <div class="row">
          <a class="btn accent" href="#/${mod.id}/flashcards" onclick="setTimeout(()=>location.reload(),50)">Another round</a>
          <a class="btn" href="#/${mod.id}">Back to module</a>
        </div>
      `;
      return;
    }
    paint();
  }

  paint();
}

function resetLeitner(modId) {
  if (!confirm('Reset all flashcard box positions?')) return;
  const s = loadStore();
  if (s[modId]) { s[modId].leitner = {}; saveStore(s); }
  location.reload();
}

// ====================================================
// MULTIPLE CHOICE QUIZ
// ====================================================
function renderQuiz(root, mod) {
  const questions = shuffle([...mod.quiz]);
  let currentIdx = 0;
  let answers = []; // {qIdx, picked, correct}

  function paint() {
    if (currentIdx >= questions.length) return showResults();
    const q = questions[currentIdx];
    root.innerHTML = `
      ${crumbs(mod.title, 'Quiz')}
      <h1>Multiple Choice</h1>
      <div class="quiz-q">
        <div class="qnum">Q ${currentIdx + 1} / ${questions.length}</div>
        <div class="qtext">${escapeHTML(q.q)}</div>
        <div class="quiz-choices">
          ${q.choices.map((c, i) => `
            <button class="quiz-choice" data-i="${i}">
              <span class="letter">${String.fromCharCode(65 + i)}</span>${escapeHTML(c)}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="row"><a class="btn" href="#/${mod.id}">Exit quiz</a></div>
    `;

    root.querySelectorAll('.quiz-choice').forEach(btn => {
      btn.onclick = () => {
        const picked = parseInt(btn.dataset.i);
        const isCorrect = picked === q.answer;
        // mark choices
        root.querySelectorAll('.quiz-choice').forEach((b, i) => {
          b.disabled = true;
          if (i === q.answer) b.classList.add('correct');
          else if (i === picked) b.classList.add('wrong');
        });
        // explanation
        const expl = document.createElement('div');
        expl.className = 'quiz-explain';
        expl.innerHTML = `<strong>${isCorrect ? '✓ Correct.' : '✗ Not quite.'}</strong> ${escapeHTML(q.explain)}`;
        root.querySelector('.quiz-q').appendChild(expl);
        // next button
        const next = document.createElement('div');
        next.className = 'row';
        next.innerHTML = `<button class="btn accent" id="next-q">${currentIdx + 1 === questions.length ? 'See results →' : 'Next question →'}</button>`;
        root.querySelector('.quiz-q').appendChild(next);
        document.getElementById('next-q').onclick = () => {
          answers.push({ correct: isCorrect });
          currentIdx++;
          paint();
        };
      };
    });
  }

  function showResults() {
    const correct = answers.filter(a => a.correct).length;
    const total = questions.length;
    const pct = Math.round(100 * correct / total);
    // save score
    const prog = getProgress(mod.id);
    const scores = [...(prog.quizScores || []), correct];
    setProgress(mod.id, { quizScores: scores });

    let verdict;
    if (pct >= 90) verdict = "Nailed it. Mastery territory.";
    else if (pct >= 75) verdict = "Solid. One more pass and you've got this.";
    else if (pct >= 60) verdict = "Decent. Hit the flashcards before the next attempt.";
    else verdict = "Back to the lessons — then drill the cards.";

    root.innerHTML = `
      ${crumbs(mod.title, 'Quiz')}
      <h1>Results</h1>
      <div class="score-banner">
        <div class="big">${correct}/${total}</div>
        <div class="label">${pct}% · ${escapeHTML(verdict)}</div>
      </div>
      <p class="center muted">Best score so far: ${Math.max(...scores)}/${total}</p>
      <div class="row">
        <a class="btn accent" href="#/${mod.id}/quiz" onclick="setTimeout(()=>location.reload(),50)">Try again</a>
        <a class="btn" href="#/${mod.id}/flashcards">Drill flashcards</a>
        <a class="btn" href="#/${mod.id}">Back to module</a>
      </div>
    `;
  }

  paint();
}

// ====================================================
// FREE RECALL
// ====================================================
function renderRecall(root, mod) {
  let idx = 0;
  const prompts = mod.free_recall;
  let allFeedback = [];

  function paint() {
    if (idx >= prompts.length) return showSummary();
    const p = prompts[idx];
    root.innerHTML = `
      ${crumbs(mod.title, 'Free Recall')}
      <h1>Free Recall</h1>
      <p class="muted mono" style="font-size:0.75rem;">${idx + 1} / ${prompts.length}</p>
      <div class="recall-q">
        <div class="prompt">${escapeHTML(p.prompt)}</div>
        <textarea id="recall-input" placeholder="Type your answer from memory…" autofocus></textarea>
        <div class="row">
          <button class="btn accent" id="check-btn">Check answer</button>
          <button class="btn" id="skip-btn">Skip</button>
        </div>
        <div id="feedback-area"></div>
      </div>
      <div class="row"><a class="btn" href="#/${mod.id}">Exit</a></div>
    `;

    document.getElementById('check-btn').onclick = () => check(false);
    document.getElementById('skip-btn').onclick = () => check(true);
  }

  function check(skipped) {
    const p = prompts[idx];
    const input = document.getElementById('recall-input').value.toLowerCase();
    const hits = [];
    const misses = [];
    p.accept.forEach(term => {
      if (input.includes(term.toLowerCase())) hits.push(term);
      else misses.push(term);
    });
    const score = hits.length / p.accept.length;
    let cls = 'poor', label = 'Try again';
    if (skipped) { cls = 'poor'; label = 'Skipped'; }
    else if (score >= 0.8) { cls = 'good'; label = 'Strong recall'; }
    else if (score >= 0.4) { cls = 'partial'; label = 'Partial — review and retry'; }

    const fbArea = document.getElementById('feedback-area');
    fbArea.innerHTML = `
      <div class="recall-feedback ${cls}">
        <span class="label">${label}</span>
        ${!skipped ? `
          <div class="matched-terms">
            ${hits.map(h => `<span class="chip">✓ ${escapeHTML(h)}</span>`).join('')}
            ${misses.map(m => `<span class="chip miss">✗ ${escapeHTML(m)}</span>`).join('')}
          </div>
        ` : ''}
        <div class="ideal"><strong>Ideal answer:</strong> ${escapeHTML(p.ideal)}</div>
        <div class="spacer-md"></div>
        <button class="btn accent" id="cont-btn">${idx + 1 === prompts.length ? 'See summary →' : 'Next prompt →'}</button>
      </div>
    `;
    allFeedback.push({ score, skipped });
    document.getElementById('cont-btn').onclick = () => { idx++; paint(); };
    document.getElementById('check-btn').disabled = true;
    document.getElementById('recall-input').disabled = true;
  }

  function showSummary() {
    const avg = allFeedback.reduce((s, f) => s + (f.skipped ? 0 : f.score), 0) / prompts.length;
    const pct = Math.round(avg * 100);
    root.innerHTML = `
      ${crumbs(mod.title, 'Free Recall')}
      <h1>Recall complete</h1>
      <div class="score-banner">
        <div class="big">${pct}%</div>
        <div class="label">Average term match across ${prompts.length} prompts</div>
      </div>
      <div class="row">
        <a class="btn accent" href="#/${mod.id}/recall" onclick="setTimeout(()=>location.reload(),50)">Another pass</a>
        <a class="btn" href="#/${mod.id}">Back to module</a>
      </div>
    `;
  }

  paint();
}

// ====================================================
// DRAG-AND-DROP MATCHING
// ====================================================
function renderMatch(root, mod) {
  const m = mod.matching;
  // build chip bank: every value across all environments, but DEDUPED per axis
  // present each chip as many times as it appears in the answer key (since multiple envs share "Sequential" etc.)
  const chips = [];
  m.environments.forEach(env => {
    env.values.forEach((v, axisIdx) => {
      chips.push({ text: v, axis: axisIdx, used: false, id: `${env.name}-${axisIdx}` });
    });
  });
  shuffle(chips);

  // slot state: 2D array [envIdx][axisIdx] = chipId or null
  const slots = m.environments.map(() => m.properties.map(() => null));
  let checked = false;

  function paint() {
    root.innerHTML = `
      ${crumbs(mod.title, 'Matching')}
      <h1>Classify Environments</h1>
      <p class="lede">${escapeHTML(m.instructions)} Drag a chip into the slot under the right axis for each environment.</p>

      <div class="match-bank">
        <h3>Property chips · drag from here</h3>
        <div class="bank-chips" id="bank">
          ${chips.map(c => `
            <div class="chip-draggable${c.used ? ' used' : ''}" draggable="true" data-id="${c.id}" data-axis="${c.axis}">
              ${escapeHTML(c.text)}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="match-board">
        ${m.environments.map((env, ei) => `
          <div class="match-row">
            <div class="match-env">${escapeHTML(env.name)}</div>
            <div class="match-slots">
              ${m.properties.map((axis, ai) => {
                const chipId = slots[ei][ai];
                const chip = chipId ? chips.find(c => c.id === chipId) : null;
                let cls = 'match-slot';
                if (chip) cls += ' filled';
                if (checked && chip) {
                  cls += (chip.text === env.values[ai]) ? ' correct' : ' wrong';
                }
                return `
                  <div class="${cls}" data-env="${ei}" data-axis="${ai}">
                    <div>
                      <span class="axis">${escapeHTML(axis)}</span>
                      ${chip ? escapeHTML(chip.text) : '—'}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="row">
        <button class="btn accent" id="check-match" ${checked ? 'disabled' : ''}>Check answers</button>
        <button class="btn" id="reset-match">Reset</button>
        <a class="btn" href="#/${mod.id}">Back to module</a>
      </div>
      <div id="match-result"></div>
    `;

    // drag handlers
    root.querySelectorAll('.chip-draggable').forEach(el => {
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', el.dataset.id);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });

    root.querySelectorAll('.match-slot').forEach(slot => {
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('over'));
      slot.addEventListener('drop', e => {
        e.preventDefault();
        slot.classList.remove('over');
        const chipId = e.dataTransfer.getData('text/plain');
        const chip = chips.find(c => c.id === chipId);
        if (!chip || chip.used) return;
        const ei = parseInt(slot.dataset.env);
        const ai = parseInt(slot.dataset.axis);
        // only allow chip to be dropped in slot of matching axis
        if (chip.axis !== ai) {
          flashSlot(slot);
          return;
        }
        // if slot already filled, return the previous chip to bank
        const prev = slots[ei][ai];
        if (prev) {
          const prevChip = chips.find(c => c.id === prev);
          if (prevChip) prevChip.used = false;
        }
        chip.used = true;
        slots[ei][ai] = chip.id;
        checked = false;
        paint();
      });
      // click slot to clear
      slot.addEventListener('click', () => {
        const ei = parseInt(slot.dataset.env);
        const ai = parseInt(slot.dataset.axis);
        const chipId = slots[ei][ai];
        if (chipId) {
          const c = chips.find(x => x.id === chipId);
          if (c) c.used = false;
          slots[ei][ai] = null;
          checked = false;
          paint();
        }
      });
    });

    document.getElementById('check-match').onclick = () => {
      checked = true;
      let correct = 0, total = 0;
      m.environments.forEach((env, ei) => env.values.forEach((v, ai) => {
        total++;
        const chipId = slots[ei][ai];
        if (chipId) {
          const c = chips.find(x => x.id === chipId);
          if (c && c.text === v) correct++;
        }
      }));
      paint();
      const r = document.getElementById('match-result');
      const pct = Math.round(100 * correct / total);
      r.innerHTML = `
        <div class="score-banner">
          <div class="big">${correct}/${total}</div>
          <div class="label">${pct}% correct</div>
        </div>
      `;
    };

    document.getElementById('reset-match').onclick = () => {
      chips.forEach(c => c.used = false);
      slots.forEach(row => row.fill(null));
      checked = false;
      paint();
    };
  }

  function flashSlot(slot) {
    slot.style.transition = 'background 0.1s';
    const orig = slot.style.background;
    slot.style.background = 'rgba(157, 34, 53, 0.2)';
    setTimeout(() => { slot.style.background = orig; }, 250);
  }

  paint();
}

// ====================================================
// REVIEW SHEET
// ====================================================
function renderReview(root, mod) {
  root.innerHTML = `
    ${crumbs(mod.title, 'Review Sheet')}
    <h1>Review Sheet</h1>
    <p class="lede">The instructor's review questions, broken down. Try answering each in your head before opening it.</p>
    ${mod.review_sheet.map((r, i) => `
      <div class="review-q">
        <div class="q"><span class="mono muted">Q${i + 1}.</span> ${escapeHTML(r.q)}</div>
        <details>
          <summary>Show answer</summary>
          <div class="a">${escapeHTML(r.a)}</div>
        </details>
      </div>
    `).join('')}
    <div class="row"><a class="btn" href="#/${mod.id}">← Back to module</a></div>
  `;
}

// ---------- utils ----------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
