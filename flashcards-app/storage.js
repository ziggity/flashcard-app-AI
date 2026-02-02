// storage.js — versioned state with migration and safe parse
(function (global) {
  const STORAGE_KEY = 'flashcards_app_state';
  const CURRENT_VERSION = 2;

  function safeParse(raw) {
    try { return JSON.parse(raw); }
    catch (err) { console.warn('storage: bad JSON', err); try { localStorage.removeItem(STORAGE_KEY); } catch(_){} return null; }
  }

  function defaultState() {
    return {
      decks: [],
      cardsByDeckId: {},
      activeDeckId: null,
      ui: { isModalOpen: false, activeCardIndex: 0 }
    };
  }

  function migrate(payload) {
    // payload: old saved object
    if (!payload || !payload.state) return { version: CURRENT_VERSION, state: defaultState() };
    if (payload.v === CURRENT_VERSION) return { version: payload.v, state: payload.state };

    // Example migration: old shape had 'cards' (flat array) -> create a single default deck
    if (Array.isArray(payload.state.cards)) {
      const deckId = `deck-${Date.now().toString(36)}`;
      const decks = [{ id: deckId, name: 'Imported Deck', createdAt: Date.now() }];
      const cardsByDeckId = {
        [deckId]: payload.state.cards.map(c => ({
          id: `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
          front: c.q ?? '',
          back: c.a ?? '',
          updatedAt: Date.now()
        }))
      };
      return { version: CURRENT_VERSION, state: { decks, cardsByDeckId, activeDeckId: deckId, ui: { isModalOpen: false, activeCardIndex: 0 } } };
    }

    // Fallback: return default state with version bumped
    return { version: CURRENT_VERSION, state: defaultState() };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: CURRENT_VERSION, state: defaultState() };
      const payload = safeParse(raw);
      if (!payload) return { version: CURRENT_VERSION, state: defaultState() };
      if (payload.v === CURRENT_VERSION) return { version: payload.v, state: payload.state };
      return migrate(payload);
    } catch (err) {
      console.warn('storage: loadState error', err);
      return { version: CURRENT_VERSION, state: defaultState() };
    }
  }

  function saveState(state, version = CURRENT_VERSION) {
    try {
      const payload = { v: version, state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('storage: saveState error', err);
    }
  }

  global.loadState = loadState;
  global.saveState = saveState;
})(window);