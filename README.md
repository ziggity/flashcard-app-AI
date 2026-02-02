# flashcard-app-AI
Flashcards App
A minimal browser-based flashcards app to create decks, add/edit/delete cards, search, shuffle, and practice using cards. Uses localStorage for simple persistence and supports keyboard interactions.

Features ✅
Create, rename, and switch decks
Add / Edit / Delete cards (front/back)
Flip cards with click or Enter/Space (3D flip animation)
Prev / Next navigation, Shuffle deck
Debounced search (300ms) with match count display
Versioned localStorage storage with safe parse & migration
Quick start ⚡
Open the app in your browser:
Double-click index.html, or
Serve locally: cd flashcards-app && python -m http.server 8000 and open http://localhost:8000
Use the header New Deck to create decks.
Use + New Card to add cards, click ✏️ to edit, 🗑️ to delete, and click or press Enter/Space to flip.
Files & structure 🔧
index.html — UI layout
styles.css — styles, including 3D flip and accessibility helpers
app.js — application logic (decks, cards, UI interactions)
storage.js — versioned localStorage helpers (loadState / saveState)
README.md — this file
Persistence & migration 💾
State is saved with a version tag. If an older data shape is detected, migration logic imports old cards into a default deck to avoid data loss.

Accessibility ♿
Search has an accessible label and live match count
Card is keyboard-focusable and announces side via aria-label
Buttons are operable by keyboard and have aria-labels
Development & tests 🧪
Edit code in app.js, styles.css and reload in browser.
Run a local server for consistent behavior (python -m http.server).
Consider adding unit tests and localStorage export/import if you need persistence across devices.
License & notes ✨
Small demo project. Use or extend freely.