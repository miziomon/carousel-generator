# Carosello Builder — Migrazione tab Tema → Sidebar fissa collassabile

> **Per Claude Code**: questo prompt rifattorizza il layout principale dell'app. La tab "Tema" attuale viene smantellata e i suoi controlli migrano in una **sidebar sempre presente sul lato sinistro**, con toggle aperto/chiuso. Leggi tutto, fai domande se serve, poi parti dalla Fase 1.

---

## 0. Scope e principio guida

Questo è **principalmente un refactoring di layout**, non l'introduzione di nuova logica.

I controlli che vivono oggi nella tab "Tema" funzionano già:
- Selezione template
- Selezione e gestione palette
- Color picker dei 6 colori
- Contrast checker
- Configurazione header (kicker_default, show_topline, show_dot)
- Configurazione footer (name, show_separator_line, show_meta_number)
- Configurazione fonts

Quello che cambia: **dove vivono visivamente** e **come l'utente li raggiunge**. La logica sottostante (azioni reducer, hook, dispatch) resta identica.

L'unica novità funzionale: la sidebar è collassabile e il suo stato è persistito.

### Cosa NON fare

- ❌ Non riscrivere i componenti dei color picker, selettori palette, contrast checker. Spostali, non duplicarli.
- ❌ Non duplicare la logica di gestione tema in due posti (vecchia tab + nuova sidebar). La tab Tema **sparisce completamente** alla fine del refactoring.
- ❌ Non introdurre nuove azioni nel reducer. Le azioni esistenti (`UPDATE_THEME`, `APPLY_PALETTE`, ecc.) sono già giuste.
- ❌ Non aggiungere "pannelli" generici nella sidebar. Per ora è dedicata al tema.

---

## 1. Layout target

### 1.1 Layout attuale (da rifattorizzare)

```
┌────────────────────────────────────────────────────────────┐
│ Header globale (logo, azioni, undo/redo, salvato Xs fa)    │
├────────────────────────────────────────────────────────────┤
│ TabBar:  [Slide]  [Tema]  [JSON]                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Contenuto della tab attiva (occupa tutta la larghezza)    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 1.2 Layout target

```
┌────────────────────────────────────────────────────────────────────┐
│ Header globale (logo, azioni, undo/redo, salvato Xs fa)            │
├──────────────┬─────────────────────────────────────────────────────┤
│              │ TabBar:  [Slide]  [JSON]                            │
│  SIDEBAR     ├─────────────────────────────────────────────────────┤
│  Tema        │                                                     │
│  (300px)     │   Contenuto della tab attiva                        │
│              │                                                     │
│              │                                                     │
│              │                                                     │
│              │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

**Quando la sidebar è chiusa:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header globale                                                       │
├──────────────────────────────────────────────────────────────────────┤
│║  TabBar:  [Slide]  [JSON]                                           │
│║  ├──────────────────────────────────────────────────────────────────┤
│║  │                                                                  │
│║  │   Contenuto della tab attiva (occupa più larghezza)              │
│║  │                                                                  │
│║  │                                                                  │
└──────────────────────────────────────────────────────────────────────┘
↑
Linguetta sticky di riapertura (28px circa, allineata verticalmente al centro o in alto)
```

### 1.3 Note importanti sul layout

- La sidebar **non vive sopra l'header globale**: l'header globale rimane in alto a tutta larghezza, la sidebar parte sotto di esso
- Quando chiusa, **NON viene nascosta del tutto**: resta una linguetta verticale stretta (~28px) sulla sinistra con un'icona freccia per riaprire
- Quando aperta, la sidebar ha **header proprio** in alto con titolo "Tema" e bottone toggle (icona freccia che indica la direzione di chiusura, es. `ChevronLeft` da Lucide)
- Quando chiusa, la TabBar e il contenuto delle tab si espandono per occupare lo spazio liberato

---

## 2. Tab "Tema": sparisce completamente

Alla fine di questo refactoring:

- ✅ La struttura tab dell'app diventa: `[Slide]` `[JSON]` — solo due tab
- ✅ Tutto il codice della tab Tema (`src/components/theme-tab/ThemeTab.jsx` e file correlati) viene rimosso o spostato
- ✅ Le references a `activeTab === 'theme'` vanno rimosse o sostituite

Dove va il contenuto della tab Tema:

| Componente attuale | Destinazione |
|---|---|
| `ThemeTab.jsx` (wrapper) | Eliminato, il suo contenuto si spalma nella sidebar |
| `TemplateSelector.jsx` | Spostato dentro la sidebar, sezione "Template" |
| `PaletteSelector.jsx`, `PaletteStatusBadge.jsx`, ColorPickers | Spostati dentro la sidebar, sezione "Palette" |
| `ContrastChecker.jsx` | Spostato dentro la sidebar, sotto i color picker |
| Form Header (kicker_default, show_topline, show_dot) | Spostato dentro la sidebar, sezione "Header" |
| Form Footer (name, show_separator_line, show_meta_number) | Spostato dentro la sidebar, sezione "Footer" |
| Form Fonts | Spostato dentro la sidebar, sezione "Fonts" |

**Importante**: stessi componenti, **non riscritti**. Solo riorganizzati nel nuovo contenitore.

L'anteprima della slide che era nella tab Tema (se presente) **non viene migrata** nella sidebar. L'anteprima è la griglia (tab Slide) che si aggiorna live.

---

## 3. Componente `Sidebar`

### 3.1 Struttura

```
┌──────────────────────────────────────┐
│ Tema                            [<]  │ ← Header sticky
├──────────────────────────────────────┤
│                                      │
│  ▼ TEMPLATE                          │ ← Sezione collassabile aperta
│    [selettore con thumbnail]         │
│    [Gestisci template...]            │
│                                      │
│  ▼ PALETTE                           │
│    [selettore con thumbnail]         │
│    [Status: in sync / modificata]    │
│    [Ri-sincronizza] [Gestisci...]    │
│    Sfondo:       [colorpick]         │
│    Superficie:   [colorpick]         │
│    Testo:        [colorpick]         │
│    Accento:      [colorpick]         │
│    Spento:       [colorpick]         │
│    Linea:        [colorpick]         │
│    [Contrast Checker]                │
│                                      │
│  ▶ HEADER                            │ ← Sezione collassata
│  ▶ FOOTER                            │
│  ▶ FONTS                             │
│                                      │
└──────────────────────────────────────┘
```

### 3.2 Specifiche dimensionali

- **Larghezza aperta**: `300px` (fisso, non `%`)
- **Larghezza chiusa**: `28px` (solo la linguetta di riapertura)
- **Altezza**: `100vh - height(header globale)`. Adatta al viewport con `overflow-y: auto` interno
- **Posizione**: `position: sticky` o `position: fixed` sotto l'header globale, a sinistra. Decidi tu in base a come è strutturato il layout attuale; preferisci `sticky` se possibile
- **Background**: stessa palette dell'app (es. `var(--app-surface)` o equivalente Tailwind). NON usare la palette del carosello (`--slide-*`): quelle sono per le slide, non per la UI dell'app

### 3.3 Header sticky

In cima alla sidebar, sempre visibile anche durante lo scroll interno:

```
┌──────────────────────────────────────┐
│ Tema                            [<]  │
└──────────────────────────────────────┘
```

- Titolo "Tema" allineato a sinistra, font dell'app (non monospace)
- Bottone toggle a destra, icona `ChevronLeft` (Lucide) quando la sidebar è aperta
- Padding interno coerente con il resto dell'app (es. 16px verticali, 20px orizzontali)
- Bordo inferiore sottile (`border-bottom: 1px solid var(--app-border)` o equivalente)

### 3.4 Linguetta di riapertura (sidebar chiusa)

Quando `isOpen === false`, la sidebar è collassata a 28px e mostra:

```
┌──────┐
│      │
│  >   │ ← Icona ChevronRight centrata verticalmente
│      │
└──────┘
```

- Larghezza 28px, altezza `100vh - header`
- Background coerente con app
- Cursor pointer al hover (l'intera linguetta è cliccabile per riaprire)
- Hover: leggero cambio di background per feedback

### 3.5 Sezioni collassabili

5 sezioni dentro la sidebar:
1. **Template** (icona `LayoutGrid` o `LayoutTemplate` Lucide)
2. **Palette** (icona `Palette` Lucide)
3. **Header** (icona `AlignStartHorizontal` o `PanelTop` Lucide)
4. **Footer** (icona `AlignEndHorizontal` o `PanelBottom` Lucide)
5. **Fonts** (icona `Type` Lucide)

Ogni sezione ha:
- Header cliccabile con icona + titolo (in maiuscolo, letter-spacing alto, es. "TEMPLATE") + chevron a destra (`ChevronDown` aperta, `ChevronRight` chiusa)
- Click sull'header toggle la sezione (apre/chiude)
- Animazione di altezza con framer-motion (`AnimatePresence` + `motion.div`)

**Stato di default delle sezioni** (al primo caricamento dell'app):
- **Template**: aperta
- **Palette**: aperta
- **Header**: chiusa
- **Footer**: chiusa
- **Fonts**: chiusa

**Persistenza**: anche lo stato collassato/aperto delle singole sezioni va persistito (vedi §5).

---

## 4. Live preview: comportamento dei cambi

### 4.1 Granularità degli aggiornamenti

Tutti i controlli della sidebar dispatchano già azioni esistenti (`UPDATE_THEME`, `APPLY_PALETTE`, ecc.) che aggiornano lo stato globale. La griglia delle slide consuma questo stato e si re-renderizza.

**Nessun cambio strutturale**: il live preview è già implicito nel pattern React/store esistente.

### 4.2 Debounce sui color picker

I color picker possono generare decine di update durante il drag dello slider HSL. Per evitare di re-renderizzare 15+ thumbnail a 60fps:

- **Debounce di 80ms** sulle azioni `UPDATE_PALETTE_INLINE` quando provengono dal drag del color picker
- Su altri input (toggle, select, input testo): nessun debounce, l'update è discreto

Pattern implementativo: il color picker emette `onChange` continuo, ma usa un hook tipo `useDebouncedCallback` (libreria `use-debounce` se non già presente) prima di chiamare `dispatch`. Quando l'utente rilascia il drag (`onChangeComplete` se disponibile), dispatcha immediatamente l'ultimo valore senza aspettare il debounce.

```js
const debouncedDispatch = useDebouncedCallback(
  (key, value) => dispatch({ type: 'UPDATE_PALETTE_INLINE', payload: { key, value } }),
  80
);

const handleColorChange = (key, value) => {
  setLocalValue(value);          // update immediato del picker
  debouncedDispatch(key, value); // dispatch debounciato
};

const handleColorChangeComplete = (key, value) => {
  debouncedDispatch.cancel();
  dispatch({ type: 'UPDATE_PALETTE_INLINE', payload: { key, value } });
};
```

### 4.3 Niente regressione di performance

Con 20+ slide nella griglia, ogni dispatch causa re-render delle thumbnail. Verifica che:
- Le `SlideCard` sono già memoizzate con `React.memo`
- Le props passate sono stabili (no oggetti inline ad ogni render)
- Le thumbnail non ri-rendere se solo `theme` cambia ma le slide no... aspetta, sì che devono ri-renderizzare perché il theme tocca tutto. Allora: verifica che `React.memo` confronti `theme` in modo efficace (shallow equal va bene se il reducer crea sempre nuovi oggetti immutabili)

Se durante il drag di un color picker la griglia rallenta visibilmente, segnala il problema nel resoconto finale.

---

## 5. Persistenza

Aggiungi al `localStorage` un nuovo blob di preferenze UI:

```js
// chiave: carosello.ui-preferences
{
  sidebarOpen: true,
  sidebarSections: {
    template: true,    // aperta
    palette: true,
    header: false,
    footer: false,
    fonts: false
  }
}
```

### 5.1 Hook dedicato

```js
// src/hooks/useUiPreferences.js
export function useUiPreferences() {
  // Carica da localStorage al mount, fornisce setters che salvano
  // ...
}
```

**Importante**: NON includere queste preferenze nello store globale `useCarouselStore`. Sono UI-only, non parte del documento di lavoro. NON vanno nell'undo/redo.

### 5.2 Caricamento al boot

Al boot dell'app:
- Se la chiave `carosello.ui-preferences` non esiste, usa i default (sidebar aperta, sezioni come da §3.5)
- Se esiste ma malformata, usa i default e logga un warning

---

## 6. Scorciatoia tastiera

`Cmd+B` (Mac) / `Ctrl+B` (Win/Linux) → toggle apertura sidebar.

Pattern: hook globale `useHotkeys` esistente nel progetto (o aggiungilo se non c'è). Quando lo shortcut viene premuto, chiama `setSidebarOpen(prev => !prev)`.

**Conflitto noto**: `Cmd+B` su mobile/desktop è anche "bookmark" del browser. In una SPA non c'è conflitto reale perché preventDefault. Aggiungi `e.preventDefault()` nell'handler.

---

## 7. Comportamento responsive

Sotto i **1024px** di viewport width, la sidebar cambia comportamento:

### 7.1 Sopra 1024px (desktop)

- Sidebar è strutturale: occupa 300px del layout, il contenuto si adatta a `calc(100% - 300px)`
- Toggle: collassa/espande inline come descritto sopra

### 7.2 Sotto 1024px (tablet, mobile)

- Sidebar diventa un **drawer overlay**: slide-in da sinistra come modale
- Default: chiusa
- Quando aperta: occupa fino a 320px da sinistra, con backdrop semitrasparente coprente il resto
- Click sul backdrop o tasto Esc chiude il drawer
- Il toggle nell'header sposta da chiusa ad aperta in overlay
- La linguetta sticky non c'è in modalità overlay (il toggle resta nell'header)

**Per detection**: usa una media query CSS + un hook `useMediaQuery(min-width: 1024px)` per disabilitare/abilitare il comportamento overlay vs strutturale.

```js
const isDesktop = useMediaQuery('(min-width: 1024px)');
```

### 7.3 Toggle nell'header (desktop e mobile)

Aggiungi un bottone "Tema" nell'header globale dell'app con icona `PanelLeft` (Lucide). Questo bottone:
- Su desktop: alterna apertura/chiusura della sidebar (è ridondante con la linguetta, ma utile)
- Su mobile: è l'unico modo per aprire il drawer (la linguetta sticky non c'è)

Posiziona il bottone all'inizio dell'header (subito dopo il logo) per evidenziare il suo ruolo "strutturale".

---

## 8. Animazioni con framer-motion

### 8.1 Apertura/chiusura sidebar (desktop)

```jsx
<motion.aside
  initial={false}
  animate={{ width: isOpen ? 300 : 28 }}
  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
  className="sidebar"
>
```

Durata: 220ms. Easing custom cubic-bezier per snap UI.

### 8.2 Drawer mobile

```jsx
<AnimatePresence>
  {isOpen && (
    <motion.aside
      initial={{ x: -320, opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0.5 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="sidebar sidebar--drawer"
    >
      ...
    </motion.aside>
  )}
</AnimatePresence>
```

Con backdrop separato animato in opacity.

### 8.3 Sezioni collassabili

```jsx
<motion.div
  initial={false}
  animate={{ height: isExpanded ? 'auto' : 0 }}
  transition={{ duration: 0.18, ease: 'easeOut' }}
  style={{ overflow: 'hidden' }}
>
```

---

## 9. Struttura cartelle aggiornata

```
src/
├── components/
│   ├── theme-tab/                              # DA RIMUOVERE
│   │   └── ThemeTab.jsx
│   │
│   ├── theme-sidebar/                          # NUOVO
│   │   ├── ThemeSidebar.jsx                    # Container principale
│   │   ├── ThemeSidebarHeader.jsx              # Header sticky "Tema" + toggle
│   │   ├── ThemeSidebarRail.jsx                # Linguetta sticky quando chiusa
│   │   ├── ThemeSection.jsx                    # Wrapper riusabile per sezione collassabile
│   │   ├── sections/
│   │   │   ├── TemplateSection.jsx
│   │   │   ├── PaletteSection.jsx              # Contiene PaletteSelector + colori + ContrastChecker
│   │   │   ├── HeaderSection.jsx
│   │   │   ├── FooterSection.jsx
│   │   │   └── FontsSection.jsx
│   │   └── theme-sidebar.css
│   │
│   └── (i componenti riusati come PaletteSelector, ColorPicker, ContrastChecker, 
│        TemplateSelector restano nelle loro cartelle attuali, semplicemente
│        importati da ThemeSidebar invece che da ThemeTab)
│
├── hooks/
│   ├── useUiPreferences.js                     # NUOVO
│   └── useMediaQuery.js                        # NUOVO (se non esiste)
│
└── App.jsx                                     # AGGIORNATO con nuovo layout
```

---

## 10. Convenzioni BEM specifiche

```
.theme-sidebar
.theme-sidebar--open
.theme-sidebar--closed
.theme-sidebar--drawer        // modalità mobile overlay
.theme-sidebar__header
.theme-sidebar__title
.theme-sidebar__toggle
.theme-sidebar__rail          // linguetta quando chiusa
.theme-sidebar__rail-icon
.theme-sidebar__content
.theme-sidebar__backdrop      // solo per modalità drawer

.theme-section
.theme-section__header
.theme-section__icon
.theme-section__title
.theme-section__chevron
.theme-section--expanded
.theme-section__body
```

---

## 11. Anti-pattern da evitare

- ❌ **Non** duplicare i componenti dei controlli tema. La tab Tema sparisce, i suoi componenti vengono riusati nella sidebar.
- ❌ **Non** introdurre nuove azioni nel reducer. Il refactoring è puramente UI.
- ❌ **Non** mettere lo stato `sidebarOpen` nel `useCarouselStore`. È UI-only, va in `useUiPreferences`.
- ❌ **Non** persistere lo stato della sidebar dentro `carosello.draft`. Va in `carosello.ui-preferences`.
- ❌ **Non** mettere lo stato sidebar nell'undo/redo (`history`). Non è un'azione documentale.
- ❌ **Non** rendere la sidebar overflowed con scrollbar visibile su desktop quando i controlli ci stanno. Usa `overflow-y: auto` ma stila la scrollbar minimal (sottile, color muted).
- ❌ **Non** dispatch alla velocità di drag dei color picker senza debounce.
- ❌ **Non** rimuovere il bottone "Tema" dall'header dopo aver aggiunto la sidebar: serve sia su desktop (alternativa al collassamento) sia su mobile (unico modo di aprire il drawer).
- ❌ **Non** lasciare codice morto della vecchia tab Tema. Cancella i file inutilizzati.
- ❌ **Non** mostrare il toggle e la linguetta sticky contemporaneamente. Quando la sidebar è aperta, vedi il toggle nell'header sidebar; quando è chiusa, vedi la linguetta. Mai entrambi.
- ❌ **Non** usare `display: none` per nascondere la sidebar. Usa `width: 28px` (animabile) o `transform: translateX()` per il drawer.

---

## 12. Workflow consigliato (a fasi)

### Fase 1 — Layout strutturale (3-4 ore)

- Crea la nuova struttura cartelle `theme-sidebar/`
- Modifica `App.jsx` per il nuovo layout: header globale, poi sotto sidebar a sinistra + contenuto a destra
- Crea `ThemeSidebar.jsx` con header + container vuoto
- Crea `ThemeSidebarRail.jsx` (linguetta sticky)
- Implementa il toggle aperto/chiuso con framer-motion
- Implementa `useUiPreferences` per persistenza
- Rimuovi la tab Tema dalla TabBar, lascia solo Slide e JSON

**Criterio di accettazione Fase 1**: la sidebar appare a sinistra, si apre/chiude con animazione, lo stato è persistito al reload. La TabBar ha 2 tab. La sidebar è ancora vuota (placeholder).

### Fase 2 — Migrazione dei controlli (4-5 ore)

- Crea `ThemeSection.jsx` (wrapper collassabile riusabile)
- Crea le 5 sezioni: `TemplateSection`, `PaletteSection`, `HeaderSection`, `FooterSection`, `FontsSection`
- Sposta dentro ciascuna sezione i componenti esistenti riusati (`TemplateSelector`, `PaletteSelector`, ecc.)
- Persisti lo stato di apertura delle singole sezioni
- Implementa il debounce sui color picker

**Criterio di accettazione Fase 2**: tutte le funzionalità della vecchia tab Tema sono accessibili dalla sidebar. Cambiando palette o template, la griglia delle slide si aggiorna live. Le sezioni collassano/espandono, lo stato è persistito.

### Fase 3 — Responsive e rifiniture (2-3 ore)

- Implementa `useMediaQuery`
- Modalità drawer overlay sotto 1024px
- Bottone "Tema" nell'header globale (con icona PanelLeft)
- Backdrop animato per il drawer
- Tasto Esc per chiudere il drawer
- Scorciatoia tastiera Cmd+B / Ctrl+B
- Cleanup: rimuovi tutti i file della vecchia tab Tema

**Criterio di accettazione Fase 3**: a 1280px funziona come sidebar fissa. A 800px (simulato dev tools) funziona come drawer overlay. Cmd+B apre/chiude. Esc chiude solo in modalità drawer.

---

## 13. Criteri di qualità finale

- [ ] La tab "Tema" non esiste più nella TabBar
- [ ] Tutti i controlli della vecchia tab Tema sono nella sidebar
- [ ] La sidebar si apre/chiude con animazione fluida
- [ ] La linguetta sticky è visibile quando la sidebar è chiusa
- [ ] Cliccando la linguetta si riapre la sidebar
- [ ] Bottone "Tema" nell'header alterna lo stato della sidebar
- [ ] Cmd+B / Ctrl+B alterna lo stato della sidebar
- [ ] Le 5 sezioni della sidebar sono collassabili
- [ ] Lo stato della sidebar (aperta/chiusa) è persistito su localStorage
- [ ] Lo stato delle singole sezioni (aperte/chiuse) è persistito
- [ ] Sotto 1024px la sidebar diventa drawer overlay con backdrop
- [ ] Cambio di palette/template/font/header/footer si riflette live sulle slide della griglia
- [ ] Il drag di un color picker non rallenta la griglia (debounce 80ms)
- [ ] L'header dell'app rimane in alto a tutta larghezza (non è coperto dalla sidebar)
- [ ] Lo stato della sidebar NON è in undo/redo (Cmd+Z non chiude la sidebar)
- [ ] Tutto il codice della vecchia tab Tema è stato rimosso (no dead code)
- [ ] Niente warning React in console
- [ ] Niente regressioni sulla generazione AI, esportazione, drag&drop slide
- [ ] La scrollbar della sidebar (quando il contenuto eccede) è minimal e non invade l'UX
- [ ] Niente flash di contenuto al primo caricamento (la sidebar parte aperta o chiusa in base alla preferenza)

---

## 14. Note finali

- L'utente è uno sviluppatore senior. Niente over-commento del codice ovvio.
- Tutti i testi UI sono in **italiano**.
- Quando incontri ambiguità, **chiedi** prima di implementare.
- Al termine, scrivi un breve resoconto: cosa hai costruito, cosa è uscito diverso da come atteso, eventuali compromessi tecnici (es. la performance del live preview con N>20 slide).
- Mantieni allineamento con le convenzioni del progetto: BEM, hooks pattern, no TypeScript.

---

**Ricorda**: questo è un refactoring di layout, non l'introduzione di nuove feature. La logica del tema è già esistente e funzionante. Spostala, non riscriverla.
