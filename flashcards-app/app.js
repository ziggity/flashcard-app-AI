// app.js - clean, defensive implementation with storage, debounced search, and delegated edit/delete
'use strict';

const el = id => document.getElementById(id);

// DOM elements
const cardEl = el('card');
const frontEl = el('card-front');
const backEl = el('card-back');
const noCardsEl = el('no-cards');
const searchCountEl = el('search-count');
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// load app state
const saved = window.loadState && loadState();
let { decks, cardsByDeckId, activeDeckId, ui } = saved?.state || loadState().state;

// ensure defaults
decks = decks || [];
cardsByDeckId = cardsByDeckId || {};
activeDeckId = activeDeckId || (decks[0]?.id ?? null);
ui = ui || { isModalOpen: false, activeCardIndex: 0 };

// helpers
function getActiveDeckCards() {
  return activeDeckId ? (cardsByDeckId[activeDeckId] || []) : [];
}

function addDeck(name) {
  const id = uid();
  const deck = { id, name, createdAt: Date.now() };
  decks.push(deck);
  cardsByDeckId[id] = [];
  activeDeckId = id;
  debouncedSave();
  renderDecks();
  applyFilter(); // refresh cards view for the new deck
}

function addCard(front, back) {
  if (!activeDeckId) return;
  const card = { id: uid(), front, back, updatedAt: Date.now() };
  cardsByDeckId[activeDeckId].push(card);
  ui.activeCardIndex = cardsByDeckId[activeDeckId].length - 1;
  debouncedSave();
  render(); // update current view
}

function editCard(cardId, front, back) {
  if (!activeDeckId) return;
  const list = cardsByDeckId[activeDeckId] || [];
  const c = list.find(x => x.id === cardId);
  if (!c) return;
  c.front = front;
  c.back = back;
  c.updatedAt = Date.now();
  debouncedSave();
  render();
}

function deleteCard(cardId) {
  if (!activeDeckId) return;
  let list = cardsByDeckId[activeDeckId] || [];
  cardsByDeckId[activeDeckId] = list.filter(x => x.id !== cardId);
  ui.activeCardIndex = Math.min(ui.activeCardIndex, (cardsByDeckId[activeDeckId].length - 1));
  debouncedSave();
  render();
}
function renderDecks() {
  const ul = document.querySelector('.decks-list');
  if (!ul) return;
  ul.innerHTML = decks.map(d =>
    `<li><button class="deck-btn" data-id="${d.id}">${d.name}</button></li>`
  ).join('');
  ul.querySelectorAll('.deck-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchDeck(btn.dataset.id);
      renderDecks();
      applyFilter(el('search')?.value || '');
      render();
    });
    btn.classList.toggle('active', btn.dataset.id === activeDeckId);
  });
}
function switchDeck(id) {
  if (!decks.find(d => d.id === id)) return;
  activeDeckId = id;
  ui.activeCardIndex = 0;
  debouncedSave();
  applyFilter(); // ensure the view now shows the selected deck
}
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
if (!decks || decks.length === 0) {
  addDeck('Default Deck');
}
renderDecks();
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
el('new-deck')?.addEventListener('click', () => {
  const name = prompt('New deck name:');
  if (!name) return;
  addDeck(name);
  renderDecks();
  applyFilter(el('search')?.value || '');
  render();
});

// debounced search and search count
const doSearch = debounce((value) => {
  applyFilter(value || '');
}, 300);

el('search')?.addEventListener('input', (e) => doSearch(e.target.value));

// initial render
applyFilter();