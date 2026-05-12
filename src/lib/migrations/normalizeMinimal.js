/**
 * Normalizzazione di un JSON minimale → carosello completo.
 *
 * Regola: nell'import esterno l'utente puo' fornire solo i campi essenziali;
 * tutti gli altri vengono riempiti con default sensati prima della validazione Zod.
 *
 * Campi davvero obbligatori per slide:
 *   - cta:        `cta_items` (case dedicato, separato)
 *   - cover/standard/divider: `lines`
 *
 * Tutto il resto (type, num, kicker, font, size, theme completo, title, ...)
 * e' opzionale: se assente viene completato da defaultCarousel o da euristiche.
 *
 * Idempotente: normalizeMinimalCarousel(normalizeMinimalCarousel(x)) === normalizeMinimalCarousel(x)
 * Tollerante: input malformato viene restituito invariato (Zod produrra' l'errore).
 */
import { defaultCarousel } from '../defaultCarousel.js'
import { getBuiltinPalette } from '../palettes/builtinPalettes.js'

// Clone profondo del theme di default (evita strutture condivise tra import diversi)
function cloneDefaultTheme() {
  const dt = defaultCarousel.theme
  return {
    palette_id: dt.palette_id,
    palette:    { ...dt.palette },
    header:     { ...dt.header },
    footer:     { ...dt.footer },
    fonts:      { ...dt.fonts },
  }
}

function normalizeTheme(theme) {
  if (!theme || typeof theme !== 'object') return cloneDefaultTheme()

  const dt = defaultCarousel.theme

  // Risolvi la palette di base: se l'utente specifica un palette_id che punta
  // a una built-in, usiamo i suoi colori come base (cosi' partial overrides
  // funzionano in modo intuitivo). Altrimenti default.
  let basePalette = dt.palette
  if (theme.palette_id) {
    const builtin = getBuiltinPalette(theme.palette_id)
    if (builtin) basePalette = builtin.colors
  }

  return {
    palette_id: theme.palette_id ?? dt.palette_id,
    palette:    { ...basePalette, ...(theme.palette || {}) },
    header:     { ...dt.header,   ...(theme.header  || {}) },
    footer:     { ...dt.footer,   ...(theme.footer  || {}) },
    fonts:      { ...dt.fonts,    ...(theme.fonts   || {}) },
  }
}

function normalizeSlide(slide, index) {
  if (!slide || typeof slide !== 'object') return slide

  const hasCtaItems    = Array.isArray(slide.cta_items) && slide.cta_items.length > 0
  const declaredAsCta  = slide.type === 'cta'

  // ── Caso CTA (dedicato) ────────────────────────────────────────────────────
  if (hasCtaItems || declaredAsCta) {
    const out = {
      num:       slide.num ?? index + 1,
      type:      'cta',
      kicker:    slide.kicker ?? null,
      font:      slide.font ?? 'archivo',
      size:      null,
      cta_items: slide.cta_items,
    }
    if (slide._note_autore !== undefined) out._note_autore = slide._note_autore
    return out
  }

  // ── Casi cover / standard / divider — richiedono lines ────────────────────
  const type = slide.type ?? 'standard'

  const base = {
    num:    slide.num ?? index + 1,
    type,
    kicker: slide.kicker ?? null,
    font:   slide.font ?? 'archivo',
    lines:  slide.lines,
  }
  if (slide._note_autore !== undefined) base._note_autore = slide._note_autore

  if (type === 'cover') {
    return {
      ...base,
      size: 'cover',
      show_swipe_arrow: slide.show_swipe_arrow ?? true,
    }
  }

  if (type === 'divider') {
    const out = {
      ...base,
      divider_number: slide.divider_number ?? String(index + 1).padStart(2, '0'),
      divider_label:  slide.divider_label ?? null,
    }
    if (slide.size !== undefined) out.size = slide.size
    return out
  }

  // standard
  return { ...base, size: slide.size ?? 'lg' }
}

/**
 * Normalizza un carosello minimale riempiendo i default mancanti.
 * Da chiamare PRIMA di migrateCarousel e PRIMA della validazione Zod.
 *
 * @param {*} raw - qualsiasi valore
 * @returns {*} - carosello arricchito di default, o input invariato se non normalizzabile
 */
export function normalizeMinimalCarousel(raw) {
  if (!raw || typeof raw !== 'object') return raw
  if (!Array.isArray(raw.slides)) return raw

  try {
    const out = {
      ...raw,
      theme:  normalizeTheme(raw.theme),
      title:  typeof raw.title === 'string' ? raw.title : (defaultCarousel.title || ''),
      slides: raw.slides.map((s, i) => normalizeSlide(s, i)),
    }
    return out
  } catch {
    return raw
  }
}
