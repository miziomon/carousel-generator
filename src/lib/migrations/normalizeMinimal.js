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
import { nanoid } from 'nanoid'

// Clone profondo del theme di default (evita strutture condivise tra import diversi)
function cloneDefaultTheme() {
  const dt = defaultCarousel.theme
  return {
    format:      dt.format,
    template_id: dt.template_id,
    palette_id:  dt.palette_id,
    palette:     { ...dt.palette },
    header:      { ...dt.header },
    footer:      { ...dt.footer },
    fonts:       { ...dt.fonts },
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

  // Merge footer preservando il campo swipe (presente solo nella versione >= 1.29)
  const defaultSwipe = dt.footer.swipe ?? { enabled: false, scope: 'cover', position_y: 130, font_size: 14 }
  const inputFooter  = theme.footer || {}
  const mergedFooter = {
    ...dt.footer,
    ...inputFooter,
    swipe: { ...defaultSwipe, ...(inputFooter.swipe || {}) },
  }

  const normalized = {
    // format e template_id vengono preservati dall'input o cadono al default.
    // Senza questa riga, migrateCarousel li sovrascriveva sempre con 'square'.
    format:      theme.format      ?? dt.format,
    template_id: theme.template_id ?? dt.template_id,
    palette_id:  theme.palette_id  ?? dt.palette_id,
    palette:     { ...basePalette, ...(theme.palette || {}) },
    header:      { ...dt.header,   ...(theme.header  || {}) },
    footer:      mergedFooter,
    fonts:       { ...dt.fonts,    ...(theme.fonts   || {}) },
  }
  // Propaga background_image globale se presente (null = forzato assente, object = immagine)
  if (theme.background_image !== undefined) {
    normalized.background_image = theme.background_image
  }
  // Normalizza global_stickers (nuovo) e migra global_sticker legacy (singolare → array)
  const STICKER_DEFAULTS = { size: 150, rotation: 0, opacity: 1, position: { x: 50, y: 50 } }
  if (Array.isArray(theme.global_stickers)) {
    normalized.global_stickers = theme.global_stickers.map((s) => ({
      ...STICKER_DEFAULTS,
      ...s,
      id: s.id ?? nanoid(8),
    }))
  } else if (theme.global_sticker && typeof theme.global_sticker === 'object') {
    // Migrazione da formato legacy (oggetto singolo) ad array
    normalized.global_stickers = [{ ...STICKER_DEFAULTS, ...theme.global_sticker, id: nanoid(8) }]
  } else {
    normalized.global_stickers = []
  }
  return normalized
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
    if (slide.background_image !== undefined) out.background_image = slide.background_image
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
  if (slide.background_image !== undefined) base.background_image = slide.background_image

  if (type === 'cover') {
    return {
      ...base,
      size: 'cover',
      // show_swipe_arrow era per-slide in versioni precedenti alla 1.29.
      // Viene eliminato qui; la migrazione a theme.footer.swipe avviene in normalizeMinimalCarousel.
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

  if (type === 'quote') {
    return {
      ...base,
      size:   slide.size ?? 'lg',
      author: slide.author ?? null,
      source: slide.source ?? null,
    }
  }

  if (type === 'blank') {
    const out = {
      num:              slide.num ?? index + 1,
      type:             'blank',
      kicker:           null,
      font:             slide.font ?? 'archivo',
      caption:          slide.caption ?? null,
      caption_position: slide.caption_position ?? 'center',
    }
    if (slide.background_image !== undefined) out.background_image = slide.background_image
    if (slide._note_autore !== undefined) out._note_autore = slide._note_autore
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
    const normalizedTheme  = normalizeTheme(raw.theme)
    const normalizedSlides = raw.slides.map((s, i) => normalizeSlide(s, i))

    // Migrazione da show_swipe_arrow per-slide (pre-1.29) a theme.footer.swipe.
    // Se almeno una cover aveva show_swipe_arrow: true e il campo swipe non era
    // già configurato dall'utente, attiva la freccia a livello tema.
    const hadSwipeArrow = raw.slides.some(
      (s) => s && s.type === 'cover' && s.show_swipe_arrow === true
    )
    if (hadSwipeArrow && !normalizedTheme.footer.swipe?.enabled) {
      normalizedTheme.footer.swipe = {
        ...normalizedTheme.footer.swipe,
        enabled: true,
        scope:   'cover',
      }
    }

    const out = {
      ...raw,
      theme:  normalizedTheme,
      title:  typeof raw.title === 'string' ? raw.title : (defaultCarousel.title || ''),
      slides: normalizedSlides,
    }
    return out
  } catch {
    return raw
  }
}
