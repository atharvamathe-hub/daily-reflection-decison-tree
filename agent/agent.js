/**
 * agent.js — The Daily Reflection Tree Engine
 *
 * Loads reflection-tree.json, walks the tree deterministically,
 * manages state, interpolates templates, and renders the UI.
 * No LLM calls. No randomness. Same answers → same path. Every time.
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TREE_URL = '../tree/reflection-tree.json';

const AXIS_MAP = {
  1: { pill: 'axisLocus',       accent: 'var(--accent-locus)',  label: 'Locus'       },
  2: { pill: 'axisOrientation', accent: 'var(--accent-orient)', label: 'Orientation' },
  3: { pill: 'axisRadius',      accent: 'var(--accent-radius)', label: 'Radius'      },
};

const NODE_BADGE_LABELS = {
  start:      { icon: '✦', text: 'Welcome'    },
  question:   { icon: '?', text: 'Question'   },
  decision:   { icon: '⟳', text: 'Routing'   },
  reflection: { icon: '◉', text: 'Reflection' },
  bridge:     { icon: '→', text: 'Transition' },
  summary:    { icon: '✦', text: 'Summary'    },
  end:        { icon: '✓', text: 'Complete'   },
};

const AXIS_CLASS_MAP = { 1: 'axis-1', 2: 'axis-2', 3: 'axis-3' };

// ─── STATE ────────────────────────────────────────────────────────────────────
let tree       = {};           // nodeId → node
let state      = {
  answers:  {},                // nodeId → { value, label }
  signals:  {},                // 'axis1:internal' → count
  history:  [],                // visited node ids
  currentAxis: 0,
};
let currentNode = null;
let selectedOption = null;
let questionCount  = 0;
let totalQuestions = 0;

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const card         = document.getElementById('card');
const nodeBadge    = document.getElementById('nodeBadge');
const cardText     = document.getElementById('cardText');
const optionsGrid  = document.getElementById('optionsGrid');
const btnContinue  = document.getElementById('btnContinue');
const summaryPanel = document.getElementById('summaryPanel');
const axesRecap    = document.getElementById('axesRecap');
const summaryNarr  = document.getElementById('summaryNarrative');
const nodeCounter  = document.getElementById('nodeCounter');
const btnRestart   = document.getElementById('btnRestart');

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
async function init() {
  spawnParticles();

  let data;
  try {
    const res = await fetch(TREE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    cardText.textContent = `⚠ Could not load tree: ${err.message}`;
    btnContinue.hidden = true;
    return;
  }

  // Index nodes by id
  for (const node of data.nodes) {
    tree[node.id] = node;
  }

  // Count question nodes for progress indicator
  totalQuestions = data.nodes.filter(n => n.type === 'question').length;

  renderNode('START');
}

// ─── TREE WALKER ──────────────────────────────────────────────────────────────
function renderNode(id) {
  const node = tree[id];
  if (!node) { console.error('Unknown node:', id); return; }

  currentNode  = node;
  selectedOption = null;

  state.history.push(id);

  // Update axis progress bar
  if (node.axis) updateAxisHeader(node.axis);

  // Animate card out → update → animate in
  if (state.history.length > 1) {
    card.classList.add('exiting');
    setTimeout(() => {
      card.classList.remove('exiting');
      paintNode(node);
      card.classList.add('entering');
      setTimeout(() => card.classList.remove('entering'), 500);
    }, 310);
  } else {
    paintNode(node);
    card.classList.add('entering');
    setTimeout(() => card.classList.remove('entering'), 500);
  }

  // decision nodes are invisible — auto-route immediately
  if (node.type === 'decision') {
    setTimeout(() => autoRoute(node), 0);
  }
}

function paintNode(node) {
  // Set card accent class
  card.className = 'card ' + (node.axis ? AXIS_CLASS_MAP[node.axis] : 'axis-end');

  // Badge
  const badge = NODE_BADGE_LABELS[node.type] || { icon: '·', text: node.type };
  nodeBadge.textContent = `${badge.icon}  ${badge.text}`;
  nodeBadge.className   = `node-badge badge-${node.type}`;

  // Text (with interpolation)
  const rendered = interpolate(node.text || '');
  typeText(cardText, rendered);

  // Clear options
  optionsGrid.innerHTML = '';
  optionsGrid.hidden = true;
  btnContinue.hidden = true;
  btnContinue.disabled = true;

  if (node.type === 'question') {
    questionCount++;
    updateCounter();
    renderOptions(node);
  } else if (node.type === 'decision') {
    // invisible — no UI
  } else if (node.type === 'summary') {
    // Show the full card first, then open summary panel
    btnContinue.textContent = 'View My Reflection  ✦';
    btnContinue.classList.remove('btn-arrow');
    btnContinue.hidden   = false;
    btnContinue.disabled = false;
    btnContinue.onclick  = () => openSummaryPanel(node);
  } else if (node.type === 'end') {
    btnContinue.hidden = true;
    // auto-open summary if not already open
    setTimeout(() => openSummaryPanel(node), 400);
  } else {
    // start, reflection, bridge → Continue button
    const nextId = resolveNext(node);
    btnContinue.textContent = node.type === 'start' ? 'Begin  →' : 'Continue  →';
    btnContinue.hidden   = false;
    btnContinue.disabled = false;
    btnContinue.onclick  = () => advance(node);
  }

  // Record signal
  if (node.signal) recordSignal(node.signal);
}

// ─── OPTIONS ──────────────────────────────────────────────────────────────────
function renderOptions(node) {
  optionsGrid.hidden = false;
  const labels = 'ABCDE';

  node.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className   = 'option-btn';
    btn.id          = `opt-${node.id}-${i}`;
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-pressed', 'false');

    const idx = document.createElement('span');
    idx.className   = 'option-index';
    idx.textContent = labels[i];
    idx.setAttribute('aria-hidden', 'true');

    const lbl = document.createElement('span');
    lbl.textContent = opt.label;

    btn.appendChild(idx);
    btn.appendChild(lbl);

    btn.addEventListener('click', () => selectOption(node, opt, btn));
    optionsGrid.appendChild(btn);
  });

  // Continue button (disabled until option picked)
  btnContinue.textContent = 'Continue  →';
  btnContinue.hidden   = false;
  btnContinue.disabled = true;
  btnContinue.onclick  = () => confirmAnswer(node);
}

function selectOption(node, opt, btn) {
  // Deselect all
  optionsGrid.querySelectorAll('.option-btn').forEach(b => {
    b.classList.remove('selected');
    b.setAttribute('aria-pressed', 'false');
  });
  // Select this one
  btn.classList.add('selected');
  btn.setAttribute('aria-pressed', 'true');
  selectedOption = opt;

  btnContinue.disabled = false;
}

function confirmAnswer(node) {
  if (!selectedOption) return;

  // Store answer
  state.answers[node.id] = selectedOption;

  // Record signal if present
  if (node.signal) recordSignal(node.signal);

  advance(node);
}

// ─── ROUTING ──────────────────────────────────────────────────────────────────
function advance(node) {
  const nextId = resolveNext(node);
  if (nextId) {
    renderNode(nextId);
  }
}

function resolveNext(node) {
  // Explicit target always wins
  if (node.target) return node.target;

  // Find children in tree (nodes whose parentId === this node's id)
  const children = Object.values(tree).filter(n => n.parentId === node.id);
  if (children.length === 1) return children[0].id;
  if (children.length > 1)  return children[0].id; // fallback

  return null;
}

function autoRoute(decisionNode) {
  const prevNodeId = state.history[state.history.length - 2];
  const prevAnswer = state.answers[prevNodeId];
  const answerValue = prevAnswer ? prevAnswer.value : null;

  for (const route of (decisionNode.routing || [])) {
    const cond = route.condition;

    if (cond.startsWith('answer=')) {
      const allowed = cond.slice(7).split('|');
      if (answerValue && allowed.includes(answerValue)) {
        renderNode(route.target);
        return;
      }
    }

    if (cond.startsWith('signal=')) {
      // e.g. "signal=axis1.dominant=internal"
      const parts = cond.slice(7).split('=');
      if (computeDominant(parts[0]) === parts[1]) {
        renderNode(route.target);
        return;
      }
    }
  }

  // No matching route — fall through to first
  if (decisionNode.routing && decisionNode.routing.length > 0) {
    renderNode(decisionNode.routing[0].target);
  }
}

// ─── SIGNALS & STATE ──────────────────────────────────────────────────────────
function recordSignal(signal) {
  state.signals[signal] = (state.signals[signal] || 0) + 1;
}

function computeDominant(axis) {
  // axis = 'axis1', returns 'internal' | 'external' etc.
  const prefix = axis + ':';
  const counts = {};
  for (const [key, val] of Object.entries(state.signals)) {
    if (key.startsWith(prefix)) {
      const pole = key.slice(prefix.length);
      counts[pole] = (counts[pole] || 0) + val;
    }
  }
  if (Object.keys(counts).length === 0) return 'balanced';
  return Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
}

function getDominantLabel(axis) {
  const dom = computeDominant(axis);
  const labels = {
    internal:     'toward agency',
    external:     'toward reflection on circumstances',
    contribution: 'toward contribution',
    entitlement:  'toward self-focus',
    self:         'toward self-centrism',
    other:        'toward altrocentrism',
    balanced:     'in balance',
  };
  return labels[dom] || dom;
}

// ─── INTERPOLATION ────────────────────────────────────────────────────────────
function interpolate(text) {
  return text
    // {NODEID.answer} → the value selected
    .replace(/\{(\w+)\.answer\}/g, (_, id) => {
      const a = state.answers[id];
      return a ? a.value : '…';
    })
    // {NODEID.label} → the human-readable label selected
    .replace(/\{(\w+)\.label\}/g, (_, id) => {
      const a = state.answers[id];
      return a ? a.label : '…';
    })
    // {axis1.dominant} etc.
    .replace(/\{(axis\d)\.dominant\}/g, (_, ax) => getDominantLabel(ax))
    // {summary_reflection} → pick the right closing line
    .replace(/\{summary_reflection\}/g, () => pickSummaryReflection());
}

function pickSummaryReflection() {
  const a1 = computeDominant('axis1');
  const a2 = computeDominant('axis2');
  const a3 = computeDominant('axis3');
  const key = `${a1}_${a2}_${a3}`;
  const summaryNode = tree['SUMMARY'];
  const reflections = summaryNode.summary_reflections || {};
  return reflections[key] || "Every day you show up is data. Use it.";
}

// ─── SUMMARY PANEL ────────────────────────────────────────────────────────────
function openSummaryPanel(node) {
  summaryPanel.hidden = false;

  // Build axes recap
  axesRecap.innerHTML = '';
  const axisData = [
    { label: 'Locus',       axis: 'axis1', color: 'var(--accent-locus)',  poles: ['internal','external'] },
    { label: 'Orientation', axis: 'axis2', color: 'var(--accent-orient)', poles: ['contribution','entitlement'] },
    { label: 'Radius',      axis: 'axis3', color: 'var(--accent-radius)', poles: ['other','self'] },
  ];

  axisData.forEach(({ label, axis, color, poles }) => {
    const dom = computeDominant(axis);
    const total = poles.reduce((s, p) => s + (state.signals[`${axis}:${p}`] || 0), 0);
    const primary = state.signals[`${axis}:${poles[0]}`] || 0;
    const pct = total > 0 ? Math.round((primary / total) * 100) : 50;

    const card2 = document.createElement('div');
    card2.className = 'axis-recap-card';
    card2.style.setProperty('--axis-color', color);
    card2.setAttribute('role', 'listitem');

    card2.innerHTML = `
      <div class="axis-recap-name">${label}</div>
      <div class="axis-recap-pole">${dom}</div>
      <div class="axis-recap-bar">
        <div class="axis-recap-fill" style="width:0%;background:${color}" data-pct="${pct}"></div>
      </div>
    `;
    axesRecap.appendChild(card2);

    // Animate bar after mount
    setTimeout(() => {
      card2.querySelector('.axis-recap-fill').style.width = pct + '%';
    }, 100);
  });

  // Narrative
  const summaryNode = tree['SUMMARY'];
  if (summaryNode) {
    const rendered = interpolate(summaryNode.text || '');
    // Convert **bold** to <strong>
    summaryNarr.innerHTML = rendered
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
}

// ─── TYPING ANIMATION ─────────────────────────────────────────────────────────
function typeText(el, text, speed = 18) {
  el.innerHTML = '';
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  el.appendChild(cursor);

  // Convert **bold** inline
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  const spans = parts.map(part => {
    const span = document.createElement(part.startsWith('**') ? 'strong' : 'span');
    span.textContent = part.replace(/\*\*/g, '');
    return { el: span, chars: (part.replace(/\*\*/g, '')) };
  });

  const allChars = spans.flatMap(s => s.chars.split('').map(c => ({ char: c, node: s.el })));
  const charNodes = {};
  spans.forEach(s => { el.insertBefore(s.el, cursor); s.el.textContent = ''; });

  function tick() {
    if (i >= allChars.length) {
      cursor.remove();
      return;
    }
    const { char, node } = allChars[i];
    node.textContent += char;
    i++;
    setTimeout(tick, speed);
  }
  tick();
}

// ─── AXIS HEADER ──────────────────────────────────────────────────────────────
function updateAxisHeader(axis) {
  if (axis === state.currentAxis) return;

  const prevAxis = state.currentAxis;
  state.currentAxis = axis;

  // Mark previous axes as done
  for (let a = 1; a < axis; a++) {
    const pill = document.getElementById(AXIS_MAP[a].pill);
    if (pill) {
      pill.classList.remove('active');
      pill.classList.add('done');
      pill.style.setProperty('--accent-color', AXIS_MAP[a].accent);
    }
  }

  // Activate current axis
  const activePill = document.getElementById(AXIS_MAP[axis].pill);
  if (activePill) {
    activePill.classList.add('active');
    activePill.classList.remove('done');
    activePill.style.setProperty('--accent-color', AXIS_MAP[axis].accent);
  }
}

function updateCounter() {
  nodeCounter.textContent = `${questionCount} / ${totalQuestions} questions`;
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
function spawnParticles() {
  const canvas = document.getElementById('bgCanvas');
  const colors = ['#6c63ff', '#00c9a7', '#ff8c42'];
  const count  = 18;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width:${size}px;
      height:${size}px;
      left:${Math.random() * 100}%;
      top:${100 + Math.random() * 20}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${12 + Math.random() * 18}s;
      animation-delay: ${Math.random() * 12}s;
      filter: blur(${Math.random() * 1}px);
    `;
    canvas.appendChild(p);
  }
}

// ─── RESTART ──────────────────────────────────────────────────────────────────
btnRestart.addEventListener('click', () => {
  summaryPanel.hidden = true;
  state = { answers: {}, signals: {}, history: [], currentAxis: 0 };
  selectedOption = null;
  questionCount  = 0;

  // Reset axis pills
  Object.values(AXIS_MAP).forEach(({ pill }) => {
    const el = document.getElementById(pill);
    if (el) el.className = 'axis-pill';
  });

  renderNode('START');
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────
init();
