// storage.js — safe, versioned localStorage helpers
(function (global) {
  const STORAGE_KEY = 'flashcards_app_state';
  const CURRENT_VERSION = 1;

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (err) { console.warn('storage: bad JSON', err); try { localStorage.removeItem(STORAGE_KEY); } catch(_){} return null; }
  }

  function loadState(expectedVersion = CURRENT_VERSION) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const payload = safeParse(raw);
      if (!payload || typeof payload !== 'object') return null;
      return { version: payload.v, state: payload.state };
    } catch (err) {
      console.warn('storage: loadState error', err);
      return null;
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