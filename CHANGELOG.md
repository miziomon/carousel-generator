# Changelog

## [1.15.0] — 2026-05-15

### Added
- **Immagini di sfondo per le slide**: ogni slide può avere un'immagine opzionale con controlli di opacità, sfocatura (blur), posizione (9-grid) e overlay (scuro / chiaro / palette)
- **Tipo slide "Blank"**: canvas privo di header/footer, mostra solo l'immagine di sfondo con didascalia opzionale (posizione configurabile: top / center / bottom)
- **Tab nell'EditModal**: la form è divisa in due tab — "Contenuto" (tipo, testo, campi specifici) e "Sfondo" (gestione completa immagine)
- **BackgroundImageLayer**: layer DOM a 3 livelli (`z-index` 0 bg, 1 overlay, 2 contenuto) nel renderer delle slide
- `src/components/edit-modal/BackgroundImageSection.jsx` — orchestratore stato upload/editor
- `src/components/edit-modal/BackgroundImageEditor.jsx` — editor con anteprima, slider opacità/blur, 9-grid posizione, overlay
- `src/components/edit-modal/BackgroundImageUpload.jsx` — area upload con drag & drop
- `src/components/edit-modal/BackgroundImagePreview.jsx` — mini-anteprima rispettosa del formato
- `src/components/edit-modal/PositionGrid.jsx` — selettore posizione 3×3
- `src/slide-renderer/BackgroundImageLayer.jsx` — layer bg + overlay nel renderer
- `src/slide-renderer/BlankSlide.jsx` — componente slide blank con caption opzionale
- `src/lib/images/processImage.js` — pipeline resize (max 1080px) + JPEG 0.85
- `src/lib/images/estimateSize.js` — stima dimensione carosello con warning a 4 MB
- `src/lib/color/normalize.js` — helper `hexToRgb`
- `src/assets/presets/blank.json` — preset slide blank

### Changed
- **EditModal**: anteprima rispetta l'aspect ratio del formato (portrait/landscape/square)
- **Schema Zod**: aggiunto `BackgroundImageSchema` e `BlankSlideSchema`
- `slide-renderer.css`: aggiunto `isolation: isolate` su `.slide` per clip corretto del blur

---

## [1.14.0] — 2026-05-15

### Added
- **Libreria caroselli**: salvataggio, apertura, rinomina ed eliminazione dei caroselli su DB tramite API REST
- **Bottone "Salva carosello"**: primo salvataggio via modale con anteprima thumbnail, sovrascrittura diretta o "Salva come nuovo" via popup
- **Bottone "Apri carosello"**: libreria con ricerca debounced, ordinamento (6 opzioni), lista scrollabile con thumbnail e badge AI
- **SyncIndicator**: indicatore di stato sync nel header (nuovo / modifiche non salvate / sincronizzato / salvataggio in corso)
- **UserMenu**: dropdown sull'email utente con voci "I tuoi caroselli" e "Logout"
- **Tier e limiti**: utenti `free` fino a 10 caroselli, `pro`/`admin` illimitati; bottone disabilitato a limite raggiunto
- **Thumbnail**: generazione automatica PNG della prima slide al salvataggio
- `src/lib/carousel/api.js` — client REST per tutti gli endpoint `/carousel/*`
- `src/lib/carousel/generateThumbnail.js` — render off-screen slide 1
- `src/lib/carousel/suggestTitle.js` — suggerimento titolo automatico
- `src/lib/utils/timeAgo.js` — formatter tempo relativo in italiano
- `src/lib/auth/tier.js` — derivazione tier da `role`/`plan`, helper `canSaveCarousel`
- `src/hooks/useCarouselCount.js` — contatore caroselli salvati con `refresh()`
- Nuove azioni store: `SET_DOCUMENT_IDENTITY`, `SET_IS_SAVING`, `LOAD_FROM_DB`, `CLEAR_DOCUMENT_IDENTITY`, `UPDATE_DOCUMENT_TITLE`

### Fixed
- **Formato JSON ignorato all'import**: `normalizeMinimalCarousel` non preservava `format` e `template_id` — il carosello importato tornava sempre a 1:1
- **Warning `flushSync`**: `generateThumbnail` chiamato da `useEffect` causava "flushSync called from inside a lifecycle method"; risolto con `setTimeout(0)`
- **`user_id` assente nel body API**: `App.jsx` leggeva `auth.user?.id` invece di `auth.user?.userId`, causando un `ValidationError` dal backend

---

## [1.13.0] — 2026-05-13

### Added
- Thumbnail griglia nella preview slide
- Readability warning per formato non quadrato
- Sezione Formato nella sidebar Tema

### Changed
- Calibrazioni tipografiche per format Editorial e Bold
- Container slide parametrizzato via CSS variables
- Registry formati con migrazione retrocompat e action `APPLY_FORMAT`

---

## [1.12.1] — 2026-05-10

### Fixed
- Ripristino padding slide invertito da import `TEMPLATES` in `App.jsx`

---

## [1.12.0] — 2026-05-10

### Added
- Template selector apre la modale direttamente

---

## [1.11.0] — 2026-05-09

### Added
- ThemeSidebar: pannello Tema diventa sidebar collassabile
