# Carosello Builder — UI per generazione AI (solo scaffolding)

> **Per Claude Code**: questo prompt aggiunge UI per una futura feature "Genera carosello con AI". È **solo scaffolding UI**: niente chiamate API, niente logica di generazione, niente integrazione backend. Leggi tutto, fai domande se servono, poi implementa.

---

## 0. Scope esplicito: cosa NON fare

Questo è il prompt più importante di tutto il documento. Leggilo prima di scrivere una riga.

**Questo prompt NON copre**:
- Chiamate ad API esterne (Anthropic, OpenAI, ecc.)
- Logica di trasformazione testo → JSON
- Validazione del JSON generato
- Preview/diff dei risultati prima di importare
- Salvataggio di metadati `_ai_generation`
- Gestione errori di rete, rate limiting, retry
- Persistenza delle API key
- Iniezione dinamica dei caroselli passati come few-shot
- Editing del system prompt (è read-only in questa versione)

**Tutti questi aspetti arriveranno in prompt successivi**. Per ora, **SOLO UI**. Niente stub di funzioni che simulano chiamate API. Niente "TODO" nel codice che anticipano logica futura. Niente bottoni che mostrano "in lavorazione" finto. Se incontri un punto dove servirebbe logica, lascia il componente UI inerte (con tooltip esplicativo dove serve, vedi §4.5).

Pensa a questo step come al **wireframe interattivo** di una feature che esisterà tra 2 settimane. Stai costruendo le scocche, non il motore.

---

## 1. Contesto e obiettivo

L'app Carosello Builder oggi permette all'utente di creare e modificare slide manualmente. La feature in arrivo permetterà di **generare un carosello partendo da un testo** (es. un post LinkedIn) tramite chiamata a un'API AI.

In questo step costruiamo solo l'interfaccia per attivare e configurare quella generazione. La logica vera (chiamata API, parsing risposta, import) arriverà in un prompt successivo.

L'utente di riferimento — Maurizio, senior dev PHP/JS — è esattamente quello dell'app. Niente onboarding, niente tooltip lunghi: utente esperto.

---

## 2. Cosa costruire

Tre elementi nuovi:

1. **Bottone "Genera con AI"** nella tab Slide, accanto a "+ Aggiungi slide"
2. **Modale "Genera carosello con AI"** che si apre dal bottone, contenente il form di input
3. Dentro la modale, **due tab interne**: "Genera" (form di input) e "Avanzate" (visualizzazione read-only del system prompt)

---

## 3. Bottone "Genera con AI" nella tab Slide

### 3.1 Posizione

Nella tab Slide, accanto al bottone "+ Aggiungi slide" esistente. Stesso gruppo flottante in basso a destra, oppure stessa area contestuale (segui la convenzione attuale dell'app).

### 3.2 Stile

Stilato come **azione secondaria** rispetto a "+ Aggiungi slide" (che resta primario). Suggerimento di stile:

- Sfondo trasparente o leggermente accentuato
- Bordo con `var(--accent)` o classe Tailwind equivalente alla palette dell'app
- Icona Lucide a sinistra (`Sparkles` o `Wand2`)
- Testo "Genera con AI"
- Stesso pattern di hover delle altre azioni

### 3.3 Comportamento

- Click → apre la modale (§4)
- Niente conferme, niente stato di loading
- Disabled solo se l'app è in stato di errore globale (es. caricamento iniziale fallito); altrimenti sempre attivo

### 3.4 BEM class names

```
.btn-generate-ai
.btn-generate-ai__icon
.btn-generate-ai__label
```

In `slide-grid.css` o in un nuovo file dedicato secondo le convenzioni di progetto.

---

## 4. Modale "Genera carosello con AI"

### 4.1 Struttura generale

Modale full-screen overlay (segui il pattern dei modali esistenti come `PaletteManagerModal`). Larghezza fissa massima ~700px, altezza adattiva ma con limite (es. 85vh), scroll interno se necessario.

Layout:

```
┌────────────────────────────────────────────────────┐
│ Genera carosello con AI                       [X]  │
├────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │  [Genera]  [Avanzate]                       │   │ ← tab interne
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  (contenuto della tab attiva)                      │
│                                                    │
│                                                    │
├────────────────────────────────────────────────────┤
│            [Annulla]    [Genera carosello]         │ ← footer
└────────────────────────────────────────────────────┘
```

### 4.2 Tab interne

Due tab dentro la modale, mutuamente esclusive:

1. **"Genera"** (default, attiva all'apertura)
2. **"Avanzate"**

Stile tab: lineare in alto sotto il titolo del modale. Tab attiva evidenziata con underline accent. Componenti BEM:

```
.ai-modal__tabs
.ai-modal__tab
.ai-modal__tab--active
```

### 4.3 Contenuto della tab "Genera"

Un form verticale con i seguenti campi, in quest'ordine:

#### Campo 1: Testo del post (obbligatorio)

- Label: "Testo del post"
- Helper text sotto la label: "Incolla qui il post LinkedIn, l'articolo o la riflessione da trasformare in carosello"
- Componente: `<textarea>` ampio, ~12 righe, larghezza piena, font monospace o sans-serif uniforme
- Placeholder dentro la textarea: "Incolla qui il tuo testo..."
- Auto-resize verso l'alto se l'utente scrive molto (max 20 righe poi scrolla)
- **Contatore caratteri** sotto la textarea, allineato a destra, formato: `N caratteri (consigliato: 800–3000)`
- Se sotto 800: contatore in colore muted, etichetta "(troppo breve)"
- Se 800–3000: contatore in colore normale, niente etichetta extra
- Se sopra 3000: contatore in colore warning (giallo), etichetta "(troppo lungo, considera di dividerlo)"
- Niente blocco rigido sulla lunghezza, solo indicazione

#### Campo 2: Numero di slide (opzionale)

- Label: "Numero di slide"
- Helper text: "Quante slide vuoi nel carosello finale"
- Componente: slider orizzontale con range **8–18**, step 1, default **12**
- Display del valore corrente alla destra dello slider: `12 slide`
- Bottone piccolo testuale "Auto (lascia decidere all'AI)" accanto al display — se cliccato, lo stato passa a "auto" e il display mostra "Auto"
- Se l'utente muove lo slider dopo aver cliccato "Auto", torna allo stato numerico
- BEM:
  ```
  .ai-form__slider-row
  .ai-form__slider
  .ai-form__slider-value
  .ai-form__slider-auto
  ```

#### Campo 3: Istruzioni extra (opzionale)

- Label: "Istruzioni extra (opzionale)"
- Helper text: "Indicazioni specifiche su tono, focus, slide da includere o evitare"
- Componente: `<textarea>` ~3 righe, larghezza piena
- Placeholder: "Es. 'Mantieni tono ironico nella chiusura', 'Evita riferimenti tecnici', 'La slide 1 deve essere una domanda'..."
- Niente contatore caratteri

#### Blocco informativo: Few-shot dai caroselli passati

Sotto i tre campi, un piccolo blocco informativo (non un campo modificabile), stilato come callout:

```
ⓘ  L'AI userà come riferimento i tuoi N caroselli più recenti
    per imparare il tuo stile.
```

Dove `N` è il numero effettivo di caroselli salvati nell'app dall'utente (o `0` se è il primo carosello).

Se `N === 0`, il testo diventa:
```
ⓘ  Non hai ancora caroselli salvati. L'AI userà solo le sue
    regole generali. Lo stile migliorerà dopo i primi caroselli.
```

**Importante**: in questo step di scaffolding, "i tuoi N caroselli più recenti" è solo un'indicazione testuale. Non c'è ancora la logica che li recupera per davvero. Per ora, leggi `N = paletteLibrary.length` o un valore qualsiasi che hai in stato globale come placeholder. Quando arriverà l'integrazione, sarà collegato alla logica reale.

BEM:
```
.ai-form__info-banner
.ai-form__info-banner__icon
.ai-form__info-banner__text
```

### 4.4 Contenuto della tab "Avanzate"

Una vista **read-only** del system prompt che (in futuro) verrà inviato al modello AI.

Layout:

```
┌────────────────────────────────────────────────────┐
│ System prompt                                      │
│                                                    │
│ Questo è il prompt che istruisce l'AI su come     │
│ trasformare il tuo testo in carosello. È in       │
│ sola lettura.                                      │
│                                                    │
│ ┌────────────────────────────────────────────┐    │
│ │ # System prompt — Generatore...            │    │
│ │                                            │    │
│ │ Sei un assistente editoriale...            │    │
│ │                                            │    │
│ │ (testo lungo, scroll interno)              │    │
│ │                                            │    │
│ └────────────────────────────────────────────┘    │
│                                                    │
│ [Copia negli appunti]                              │
└────────────────────────────────────────────────────┘
```

Specifiche:

- **Container scrollabile** per il contenuto del prompt, altezza fissa (~400px) con `overflow-y: auto`
- Il contenuto è **markdown formattato** (titoli `#`, codice inline, tabelle, ecc.)
- Per il rendering markdown read-only usa **`react-markdown`** (libreria leggera, supporta highlight)
- Niente editing, niente textarea editabile. È solo display
- Sfondo del blocco: leggermente diverso dallo sfondo del modale (es. surface) per delimitarlo visivamente
- Font del prompt: monospace per la leggibilità del markdown
- Bottone `[Copia negli appunti]` sotto il blocco: copia il **testo grezzo markdown** (non l'HTML renderizzato) nella clipboard, toast di conferma "Prompt copiato"

#### Dove vive il system prompt come asset

Crea un file `src/lib/ai/systemPrompt.js` con il contenuto del system prompt esportato come stringa:

```js
// src/lib/ai/systemPrompt.js
export const SYSTEM_PROMPT_TEMPLATE = `# System prompt — Generatore di carosello dal testo

Sei un assistente editoriale specializzato nella trasformazione di post...

(...tutto il contenuto del file system-prompt-carosello.md...)
`;
```

Il contenuto del system prompt te lo fornirà l'utente come asset separato (file `system-prompt-carosello.md`). **Importalo as-is**, niente modifiche. La tab Avanzate lo legge da questo modulo.

BEM:
```
.ai-advanced
.ai-advanced__intro
.ai-advanced__prompt-container
.ai-advanced__copy-btn
```

### 4.5 Footer della modale

In fondo al modale, sempre visibile indipendentemente dalla tab attiva:

- **A sinistra**: bottone `[Annulla]` (secondario, chiude il modale senza fare nulla)
- **A destra**: bottone `[Genera carosello]` (primario, **disabled** in questa versione)

#### Il bottone "Genera carosello"

In questo step è **sempre disabled**. Con tooltip al hover:

> "Generazione AI in arrivo nella prossima versione"

Comportamento:
- Cursor `not-allowed`
- Opacità ridotta (es. 0.5)
- Tooltip mostrato al hover
- Niente click handler (o un click handler vuoto)

**Non implementare** stub di chiamata API. **Non simulare** loading. **Non mostrare** alert "in arrivo". Solo disabled + tooltip.

BEM:
```
.ai-modal__footer
.ai-modal__btn-cancel
.ai-modal__btn-generate
.ai-modal__btn-generate--disabled
```

### 4.6 Comportamento del modale

- **Apertura**: click sul bottone "Genera con AI" nella tab Slide
- **Chiusura**: click su `[Annulla]`, click su `[X]` in alto, tasto `Esc`
- **Stato del form**: NON persistere lo stato dei campi tra aperture. Ogni volta che il modale si apre, i campi sono vuoti (textarea), slider a default 12, tab attiva "Genera"
- **Animazione**: fade-in del backdrop, scale-in del modale, durata ~200ms. Usa framer-motion come per i modali esistenti

---

## 5. Struttura file da aggiungere

```
src/
├── components/
│   ├── slide-grid/
│   │   └── SlideGrid.jsx                    # AGGIORNATO: aggiungi bottone "Genera con AI"
│   │
│   └── ai-generator/                        # NUOVO MODULO
│       ├── AiGeneratorModal.jsx             # modale principale + tab routing
│       ├── AiGeneratorForm.jsx              # contenuto tab "Genera"
│       ├── AiAdvancedView.jsx               # contenuto tab "Avanzate"
│       ├── AiInfoBanner.jsx                 # blocco informativo caroselli passati
│       ├── AiNumberSlider.jsx               # slider 8-18 con bottone "Auto"
│       └── ai-generator.css
│
└── lib/
    └── ai/
        └── systemPrompt.js                  # NUOVO: export del system prompt come stringa
```

---

## 6. Stato locale del modale

Lo stato del form vive **dentro il modale** (componente locale, niente Redux/Zustand/stato globale per ora):

```js
// dentro AiGeneratorModal
const [activeTab, setActiveTab] = useState('genera'); // 'genera' | 'avanzate'
const [postText, setPostText] = useState('');
const [slideCount, setSlideCount] = useState(12);     // number | 'auto'
const [extraInstructions, setExtraInstructions] = useState('');
```

Quando il modale si chiude, lo stato viene scartato (perché il componente viene unmount). Quando si riapre, i valori tornano ai default.

**Niente integrazione con `useCarouselStore`** in questo step. Il modale è una bolla isolata.

---

## 7. Convenzioni di stile e accessibilità

- **Italiano** per tutti i testi UI
- **BEM** per le classi (come da convenzioni di progetto)
- **Tailwind** solo per utility (`flex`, `gap`, `p-4`, ecc.), mai per identità visiva
- **Focus trap** dentro il modale (usa l'hook esistente o `react-focus-lock` se già installato)
- **Aria-labels** appropriati sui bottoni icona
- **Tab order** corretto: textarea → slider → istruzioni → bottoni footer
- **Cmd+Enter** dentro la textarea principale: nessun comportamento per ora (in futuro = "Genera"). Per ora ignora l'evento

---

## 8. Anti-pattern da evitare

- ❌ **Non** implementare chiamate API, neanche stub
- ❌ **Non** simulare loading state con `setTimeout`
- ❌ **Non** validare il contenuto del form (es. "textarea vuota = errore"). Questo arriverà con la logica AI vera
- ❌ **Non** salvare lo stato del form in localStorage. È volatile
- ❌ **Non** integrare con `useCarouselStore`. Il modale è isolato in questo step
- ❌ **Non** rendere il system prompt editabile, anche se "sarebbe facile". Aspetta il prompt successivo
- ❌ **Non** aggiungere TODO nel codice che anticipano la logica futura ("// TODO: qui andrà la chiamata API"). Lascia il codice pulito, la logica arriverà come modifica esplicita
- ❌ **Non** mostrare il numero caroselli passati `N` come 0 fisso. Leggi un valore reale dallo stato (anche se è ancora un placeholder come `paletteLibrary.length`). Quando l'integrazione vera arriverà, basterà sostituire la fonte
- ❌ **Non** usare `dangerouslySetInnerHTML` per il rendering markdown. Usa `react-markdown` (o equivalente sicuro)
- ❌ **Non** caricare un'altra libreria per il rendering markdown se ne hai già una nel progetto. Se non c'è, installa `react-markdown` (`npm i react-markdown`)

---

## 9. Criteri di accettazione

- [ ] Il bottone "Genera con AI" appare nella tab Slide vicino a "+ Aggiungi slide"
- [ ] Cliccando il bottone si apre il modale "Genera carosello con AI"
- [ ] Il modale si apre/chiude con animazione fluida
- [ ] Tasto Esc chiude il modale
- [ ] Click su [X] chiude il modale
- [ ] Click su [Annulla] chiude il modale
- [ ] Le due tab "Genera" e "Avanzate" funzionano (toggle senza ricaricare nulla)
- [ ] Tab "Genera" mostra: textarea post, slider 8-18 con default 12, textarea istruzioni, banner informativo
- [ ] Slider mostra il valore corrente alla destra, bottone "Auto" funziona
- [ ] Contatore caratteri sotto la textarea principale si aggiorna live
- [ ] Etichetta "(troppo breve)" / nessuna / "(troppo lungo)" cambia in base ai caratteri
- [ ] Tab "Avanzate" mostra il system prompt formattato in markdown read-only, scrollabile
- [ ] Bottone "Copia negli appunti" funziona e mostra toast
- [ ] Bottone "Genera carosello" è disabled, con tooltip "Generazione AI in arrivo nella prossima versione"
- [ ] Niente warning React in console
- [ ] Niente regressioni sulle feature esistenti (template, palette, slide editor)
- [ ] Riaprendo il modale, lo stato del form è resettato

---

## 10. Note finali

- L'utente è un dev senior. Niente over-engineering, niente sovra-commento del codice ovvio
- Commenta solo scelte non ovvie (es. perché il modale resetta lo stato a ogni apertura)
- Tutti i testi UI in **italiano**
- Se hai dubbi su qualche dettaglio prima di iniziare, **fammi le domande**, non andare di fantasia
- Quando finisci, scrivimi un breve resoconto: cosa hai costruito, cosa hai dovuto improvvisare, cosa è uscito diverso da come atteso

---

**Ricorda: solo UI. Niente backend, niente logica AI. Apri la modale, mostra il form, lascia il bottone Genera disabled. Fine.**
