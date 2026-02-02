// app.js - clean, defensive implementation with storage, debounced search, and delegated edit/delete
'use strict';

const el = id => document.getElementById(id);

// DOM elements
const cardEl = el('card');
const frontEl = el('card-front');
const backEl = el('card-back');
const noCardsEl = el('no-cards');
const searchCountEl = el('search-count');

// debounce helper
function debounce(fn, wait = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// persistent storage helpers (global functions from storage.js)
const debouncedSave = debounce(() => {
  if (window.saveState) saveState({ cards, nextId });
}, 500);

// in-memory state with ids
let nextId = 1;
let cards = [
  { id: nextId++, q: 'What is 2 + 2?', a: '4' },
  { id: nextId++, q: 'Capital of France?', a: 'Paris' },
  { id: nextId++, q: 'Color of the sky?', a: 'Blue' }
];
let filtered = [...cards];
let index = 0;

// load persisted state (if any)
try {
  const saved = window.loadState && loadState();
  if (saved && saved.state && Array.isArray(saved.state.cards)) {
    cards = saved.state.cards;
    nextId = saved.state.nextId || (cards.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1);
    filtered = [...cards];
  }
} catch (err) {
  console.warn('Failed to load state:', err);
}

// render / controls
function updateSearchCount() {
  const count = filtered.length;
  if (searchCountEl) searchCountEl.textContent = `${count} match${count !== 1 ? 'es' : ''}`;
}

function updateControls() {
  el('prev')?.setAttribute('aria-disabled', String(index <= 0));
  el('prev').disabled = index <= 0;
  el('next')?.setAttribute('aria-disabled', String(index >= filtered.length - 1));
  el('next').disabled = index >= filtered.length - 1;
}

function render() {
  if (!filtered.length) {
    if (cardEl?.style) cardEl.style.display = 'none';
    if (noCardsEl) noCardsEl.hidden = false;
    updateSearchCount();
    updateControls();
    return;
  }

  if (!cardEl || !frontEl || !backEl) {
    console.warn('Missing card DOM nodes; skipping render.');
    return;
  }

  const c = filtered[index];
  cardEl.style.display = '';
  noCardsEl.hidden = true;
  frontEl.textContent = c.q;
  backEl.textContent = c.a;
  cardEl.classList.remove('is-flipped');
  cardEl.setAttribute('aria-label', `Card front. Press Enter or Space to flip.`);
  updateControls();
  updateSearchCount();
}

// flip (ignore clicks originating on buttons)
function flip(e) {
  if (e && e.type === 'click' && e.target.closest('button') && cardEl?.contains(e.target)) return;
  cardEl?.classList.toggle('is-flipped');
  const side = cardEl?.classList.contains('is-flipped') ? 'back' : 'front';
  cardEl?.setAttribute('aria-label', `Card ${side}. Press Enter or Space to flip.`);
}

// filtering
function applyFilter(query = '') {
  const q = String(query).trim().toLowerCase();
  filtered = cards.filter(c => (c.q + ' ' + c.a).toLowerCase().includes(q));
  index = Math.min(index, Math.max(filtered.length - 1, 0));
  render();
}

// delegated card actions (edit / delete) — single listener on .card-area
document.querySelector('.card-area')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  // prevent card click from flipping
  e.stopPropagation();

  // EDIT
  if (btn.classList.contains('edit-card')) {
    const c = filtered[index];
    if (!c) return;
    const q = prompt('Edit Question:', c.q);
    if (q === null) return;
    const a = prompt('Edit Answer:', c.a);
    if (a === null) return;

    // persist by id
    const original = cards.find(item => item.id === c.id);
    if (original) {
      original.q = q;
      original.a = a;
    }

    // keep view focused on edited card
    const cardId = c.id;
    applyFilter(el('search')?.value || '');
    index = Math.max(0, filtered.findIndex(item => item.id === cardId));
    debouncedSave();
    render();
    return;
  }

  // DELETE
  if (btn.classList.contains('delete-card')) {
    if (!confirm('Delete this card?')) return;
    const c = filtered[index];
    if (!c) return;
    const originalIndex = cards.findIndex(item => item.id === c.id);
    if (originalIndex >= 0) cards.splice(originalIndex, 1);
    applyFilter(el('search')?.value || '');
    index = Math.min(index, Math.max(filtered.length - 1, 0));
    debouncedSave();
    render();
    return;
  }
});

// keyboard and click flip
cardEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    flip();
  }
});
cardEl?.addEventListener('click', flip);

// UI buttons
el('prev')?.addEventListener('click', () => { if (index > 0) { index--; render(); }});
el('next')?.addEventListener('click', () => { if (index < filtered.length - 1) { index++; render(); }});
el('flip')?.addEventListener('click', flip);
el('shuffle')?.addEventListener('click', () => {
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  index = 0;
  debouncedSave();
  render();
});

// create new card
el('new-card')?.addEventListener('click', () => {
  const q = prompt('Question:');
  if (!q) return;
  const a = prompt('Answer:') || '';
  const newCard = { id: nextId++, q, a };
  cards.push(newCard);
  applyFilter(el('search')?.value || '');
  index = filtered.findIndex(c => c.id === newCard.id);
  debouncedSave();
  render();
});

// debounced search and search count
const doSearch = debounce((value) => {
  applyFilter(value || '');
}, 300);

el('search')?.addEventListener('input', (e) => doSearch(e.target.value));

// initial render
applyFilter();