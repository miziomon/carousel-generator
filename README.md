# Carosello Builder

SPA React per progettare caroselli Instagram a partire da un JSON strutturato. Anteprima live, modifica per slide, drag&drop di riordino, export PNG singolo e ZIP.

## Avvio

```bash
npm install
npm run dev       # http://localhost:5173
```

## Comandi

```bash
npm run build     # build produzione → dist/
npm run preview   # serve il build di produzione
npm test          # test suite (Vitest)
npm run lint      # ESLint
npm run format    # Prettier
```

## Stack

React 18 · Vite · Tailwind CSS · Zod · @dnd-kit · html-to-image · JSZip · CodeMirror

## Struttura JSON

Il progetto lavora con un JSON che descrive tema e slide:

```json
{
  "theme": {
    "palette": { "background": "#...", "foreground": "#...", "accent": "#...", "muted": "#...", "line": "#..." },
    "header": { "kicker_default": "...", "show_topline": true, "show_dot": true },
    "footer": { "name": "...", "show_separator_line": true, "show_meta_number": true },
    "fonts": { "primary": "archivo", "secondary": "fraunces", "mono": "jetbrains" }
  },
  "slides": [
    { "type": "cover",    "num": 1, "size": "cover", "lines": ["Titolo"], "font": "archivo" },
    { "type": "standard", "num": 2, "size": "lg",    "lines": ["..."],    "font": "archivo" },
    { "type": "divider",  "num": 3, "divider_number": "01", "lines": ["Sezione"], "font": "archivo" },
    { "type": "cta",      "num": 4, "cta_items": ["Seguimi", "Salva il post"], "font": "archivo" }
  ]
}
```

Tipi slide: `cover` · `standard` · `divider` · `cta`  
Tag inline nelle `lines`: `[hl]…[/hl]` · `[soft]…[/soft]` · `[c]…[/c]` · `[u]…[/u]` · `[em]…[/em]`

## Export

- **PNG singolo** — pulsante PNG su ogni card → file 2160×2160px (pixelRatio 2)
- **ZIP** — Header → Esporta → "Esporta ZIP" → tutti i PNG + `carosello.json`

## Funzionalità

- Importa/esporta JSON
- Modifica slide via modale con anteprima live
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z, max 50 step)
- Riordino drag&drop con tastiera
- Tab JSON con CodeMirror e validazione schema
- Auto-save in localStorage (`carosello.draft.v1`)
- Vista mobile (griglia a colonna singola)
- Warning leggibilità per testo troppo lungo
