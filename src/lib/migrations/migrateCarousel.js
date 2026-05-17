/**
 * Migrazione retrocompatibile per il formato del carosello.
 *
 * Gestisce i casi palette (A-D), template e format:
 *   A: palette 5 colori, nessun palette_id → inferisce surface, tenta match built-in
 *   B: palette 6 colori, nessun palette_id → tenta match built-in
 *   C: palette_id presente e valido → no-op
 *   D: palette_id presente ma non trovato → lascia invariato (la UI mostrerà stato custom)
 *   T: template_id assente → inietta 'system-editorial-mark' (unico template storico)
 *   F: format assente o non valido → inietta 'square' (unico formato storico)
 *
 * IMPORTANTE:
 * - Pura: non ha side effect, non accede a localStorage
 * - Idempotente: migrateCarousel(migrateCarousel(x)) === migrateCarousel(x)
 * - Tollerante: se l'input è malformato, lo restituisce invariato (sarà Zod a urlare)
 * - NON viene chiamata su tutti i draft all'avvio — solo sul carosello corrente durante il caricamento
 */
import { inferSurface } from '../palettes/colorUtils.js'
import { matchBuiltin } from '../palettes/matchBuiltin.js'
import { getBuiltinPalette } from '../palettes/builtinPalettes.js'
import { FONT_IDS } from '../fonts/registry.js'

const DEFAULT_TEMPLATE_ID  = 'system-editorial-mark'
const DEFAULT_FONTS = {
  primary:   'Archivo Black',
  secondary: 'Fraunces',
  mono:      'JetBrains Mono',
}
const DEFAULT_FORMAT_ID   = 'square'
const VALID_FORMATS       = new Set(['square', 'portrait', 'landscape'])

/**
 * Migra slide.font dal formato legacy ('archivo'|'fraunces') al semantico ('primary'|'secondary').
 * Idempotente: se il valore è già 'primary'/'secondary', lo lascia invariato.
 * @param {object} slide
 * @returns {object}
 */
function migrateSlideFont(slide) {
  if (!slide || typeof slide !== 'object') return slide
  if (slide.font === 'archivo') return { ...slide, font: 'primary' }
  if (slide.font === 'fraunces') return { ...slide, font: 'secondary' }
  if (slide.font === 'primary' || slide.font === 'secondary') return slide
  return { ...slide, font: 'primary' } // fallback safe
}

/**
 * Migra theme.fonts: ogni slot deve puntare a un ID registrato in FONT_IDS.
 * Se un ID è sconosciuto (es. JSON di una futura versione, font rimosso), usa il default.
 * @param {object} fonts
 * @returns {object}
 */
function migrateThemeFonts(fonts) {
  const f = fonts ?? {}
  return {
    primary:   FONT_IDS.includes(f.primary)   ? f.primary   : DEFAULT_FONTS.primary,
    secondary: FONT_IDS.includes(f.secondary) ? f.secondary : DEFAULT_FONTS.secondary,
    mono:      FONT_IDS.includes(f.mono)       ? f.mono      : DEFAULT_FONTS.mono,
  }
}

/**
 * Migra l'oggetto theme al formato corrente.
 * @param {object} theme
 * @returns {object}
 */
function migrateTheme(theme) {
  if (!theme || typeof theme !== 'object') return theme

  const palette = theme.palette
  if (!palette || typeof palette !== 'object') return theme

  // Distinguiamo "chiave assente" (vecchio JSON) da "chiave presente a null" (custom esplicito).
  // Un JSON.parse su vecchio formato: theme.palette_id === undefined
  // Un JSON.parse su nuovo formato custom: theme.palette_id === null
  const hasPaletteId  = 'palette_id' in theme
  const hasTemplateId = 'template_id' in theme
  const hasSurface    = 'surface' in palette && palette.surface != null

  // ── Caso T: template_id assente → era un carosello pre-templates ──────────
  const withTemplateId = hasTemplateId ? theme : { ...theme, template_id: DEFAULT_TEMPLATE_ID }

  // ── Caso F: format assente o non valido → square (formato storico) ─────────
  const hasFormat     = 'format' in withTemplateId
  const validFormat   = hasFormat && VALID_FORMATS.has(withTemplateId.format)
  const withFormat    = validFormat ? withTemplateId : { ...withTemplateId, format: DEFAULT_FORMAT_ID }

  // ── Caso A: 5 colori, nessun palette_id ──────────────────────────────────
  if (!hasSurface && !hasPaletteId) {
    const surface    = inferSurface(palette.background)
    const newPalette = { ...palette, surface }
    const matched    = matchBuiltin(newPalette)
    return { ...withFormat, palette: newPalette, palette_id: matched }
  }

  // ── Caso B: 6 colori, nessun palette_id ──────────────────────────────────
  if (hasSurface && !hasPaletteId) {
    const matched = matchBuiltin(palette)
    return { ...withFormat, palette_id: matched }
  }

  // ── Casi C e D: palette_id presente ──────────────────────────────────────
  // Se manca surface ma il palette_id punta a una built-in valida,
  // ripristiniamo i colori completi dalla built-in.
  if (hasPaletteId && theme.palette_id && !hasSurface) {
    const builtin = getBuiltinPalette(theme.palette_id)
    if (builtin) {
      return { ...withFormat, palette: { ...builtin.colors }, palette_id: theme.palette_id }
    }
  }

  // Caso C (palette_id valido, palette completa) → template_id e format se mancanti
  // Caso D (palette_id sconosciuto, palette completa) → idem, la UI gestisce il dangling
  return withFormat
}

/**
 * Migra un oggetto carosello raw al formato corrente dello schema.
 * Va chiamata SUBITO dopo JSON.parse e PRIMA della validazione Zod.
 *
 * @param {*} raw — qualsiasi valore (può essere null, undefined, non-oggetto)
 * @returns {*} — il carosello migrato, o l'input invariato se non migrabile
 */
export function migrateCarousel(raw) {
  if (!raw || typeof raw !== 'object') return raw

  try {
    const migratedTheme = migrateTheme(raw.theme)
    const slides = Array.isArray(raw.slides)
      ? raw.slides.map(migrateSlideFont)
      : raw.slides

    // Aggiorna theme.fonts solo se il theme è un oggetto valido
    const finalTheme = migratedTheme && typeof migratedTheme === 'object'
      ? { ...migratedTheme, fonts: migrateThemeFonts(migratedTheme.fonts) }
      : migratedTheme

    return { ...raw, theme: finalTheme, slides }
  } catch {
    // Non crashare mai — Zod produrrà l'errore appropriato
    return raw
  }
}
