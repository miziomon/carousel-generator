# Changelog

## [0.1.1] — 2026-05-11

### Fixed
- Tab JSON: errore "multiple instances of @codemirror/state" risolto aggiungendo `resolve.dedupe` e `optimizeDeps.include` in `vite.config.js`
- Menu "Esporta" nell'header: si apriva verso l'alto uscendo dallo schermo; ora si apre verso il basso

### Changed
- Header: logo aggiornato a "Carousel Generator" con numero di versione affianco
- Header: nome progetto ora è un campo editabile; la modifica aggiorna `theme.footer.name` e viene auto-salvata
- Header: pulsante "Aggiungi slide" spostato dall'area flottante in basso all'header, affianco a "Nuovo"

### Removed
- Pulsante flottante "+ Aggiungi slide" in basso a destra nella griglia slide

---

## [0.1.0] — 2026-05-11

### Added
- Release iniziale — Carosello Builder completo
- Renderer slide 1080×1080 con 4 tipi: cover, standard, divider, cta
- Parser tag inline: `[hl]`, `[soft]`, `[c]`, `[u]`, `[em]`
- Griglia con anteprime live e drag&drop di riordino
- Edit modal con anteprima live e toolbar tag inline
- Theme tab con color picker per tutta la palette
- Tab JSON con CodeMirror e validazione schema Zod
- Undo/Redo (max 50 step) con Ctrl+Z / Ctrl+Shift+Z
- Auto-save in localStorage (`carosello.draft.v1`)
- Export PNG singolo 2160×2160px
- Export ZIP (tutti i PNG + `carosello.json`)
- Vista mobile (griglia a colonna singola)
- Warning leggibilità M10 sulle card
- Font self-hosted: Archivo Black, Fraunces Variable, JetBrains Mono
