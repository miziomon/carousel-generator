import { z } from 'zod'
import { FONT_IDS } from './fonts/registry.js'

// ─── Palette colors (6 slot) ──────────────────────────────────────────────────
// Usato sia nel theme del carosello che nell'entita Palette della libreria.
export const PaletteColorsSchema = z.object({
  background: z.string().min(1),
  surface:    z.string().min(1),
  foreground: z.string().min(1),
  accent:     z.string().min(1),
  muted:      z.string().min(1),
  line:       z.string().min(1),
})

// ─── Palette entity (libreria) ────────────────────────────────────────────────
// Usato per validare palette nella libreria globale (carosello.palettes.v1).
// NON usato per il carosello stesso (quello usa PaletteColorsSchema inline).
export const PaletteSchema = z.object({
  id:          z.string().min(1),
  name:        z.string().min(1).max(40),
  description: z.string().max(200).optional().default(''),
  origin:      z.enum(['system', 'user']),
  colors:      PaletteColorsSchema,
  createdAt:   z.number().optional(),
  updatedAt:   z.number().optional(),
})

export const PaletteLibrarySchema = z.array(PaletteSchema)

// ─── Background image ─────────────────────────────────────────────────────────
// Definita prima di ThemeSchema perché usata sia nel theme che nelle slide.
export const BackgroundImageSchema = z.object({
  data:     z.string().startsWith('data:image/'),
  opacity:  z.number().min(0).max(1).default(1),
  blur:     z.number().min(0).max(20).default(0),
  position: z.enum([
    'top-left', 'top', 'top-right',
    'left', 'center', 'right',
    'bottom-left', 'bottom', 'bottom-right',
  ]).default('center'),
  // 'cover' | 'contain' | 'auto' oppure una stringa percentuale es. '80%'
  size:     z.string().default('cover'),
  overlay: z.object({
    enabled:   z.boolean().default(false),
    type:      z.enum(['dark', 'light', 'palette']).default('palette'),
    intensity: z.number().min(0).max(1).default(0.5),
  }).default({ enabled: false, type: 'palette', intensity: 0.5 }),
})

// Schema per override immagine a livello slide: data è opzionale.
// Quando data è assente, il renderer usa l'immagine del tema globale.
// Permette di personalizzare opacity/blur/position/overlay senza duplicare il base64.
export const SlideBackgroundImageSchema = BackgroundImageSchema.extend({
  data: z.string().startsWith('data:image/').optional(),
})

// ─── Theme ────────────────────────────────────────────────────────────────────
const ThemeSchema = z.object({
  // Formato del carosello. Sempre presente: la migrazione garantisce il valore.
  format: z.enum(['square', 'portrait', 'landscape']).default('square'),
  // ID del template visivo. Sempre presente: la migrazione garantisce il valore.
  template_id: z.string().min(1).default('system-editorial-mark'),
  // Riferimento alla palette di origine. null = palette completamente custom
  // o importata senza corrispondenza in libreria.
  palette_id: z.string().nullable().default(null),
  palette: PaletteColorsSchema,
  header: z.object({
    kicker_default:   z.string(),
    show_topline:     z.boolean(),
    show_dot:         z.boolean(),
    show_meta_number: z.boolean().default(true),
  }),
  footer: z.object({
    name:                 z.string(),
    show_separator_line:  z.boolean(),
    show_meta_number:     z.boolean(),
  }),
  fonts: z.object({
    primary:   z.enum(FONT_IDS),
    secondary: z.enum(FONT_IDS),
    mono:      z.enum(FONT_IDS),
    // Dimensioni base per slot (px). Sovrascrivono le calibrazioni dei template
    // come base size; i preset xl/lg/md diventano moltiplicatori relativi.
    sizes: z.object({
      primary:   z.number().min(8).max(120).default(68),
      secondary: z.number().min(8).max(120).default(68),
      mono:      z.number().min(8).max(120).default(18),
    }).default({ primary: 68, secondary: 68, mono: 18 }),
  }),
  // Moltiplicatore interlinea globale (1 = calibrazione template invariata).
  lineHeight: z.number().min(0.6).max(2.5).default(1),
  // CSS personalizzato iniettato globalmente su tutte le slide.
  customCss: z.string().max(20000).default(''),
  // Immagine di sfondo globale: applicata a tutte le slide che non la sovrascrivono.
  // undefined/null = nessuna immagine globale.
  background_image: BackgroundImageSchema.nullable().optional(),
})

// ─── Base fields comuni a tutti i tipi ───────────────────────────────────────
const SlideBaseFields = {
  num:              z.number().int().positive(),
  kicker:           z.string().nullable().optional(),
  // 'primary' | 'secondary' | 'mono' — mappa ai font slot del theme.
  // null esplicito sul tema globale = "forza nessuno sfondo su questa slide".
  font:             z.enum(['primary', 'secondary', 'mono']).default('primary'),
  // Override per-slide che sovrascrivono le impostazioni del tema globale.
  font_id_override:    z.enum(FONT_IDS).optional(),
  font_size_override:  z.number().min(8).max(120).optional(),
  line_height_override: z.number().min(0.6).max(2.5).optional(),
  _note_autore:     z.string().optional(),
  // undefined = eredita da theme.background_image; null = forza nessuno sfondo; object = override.
  // data può essere assente: la slide usa allora il data del tema (evita duplicazione base64).
  background_image: SlideBackgroundImageSchema.nullable().optional(),
}

// ─── Schema per tipo (senza superRefine: discriminatedUnion lo richiede) ────
// I vincoli per-tipo (cover→1 riga, divider→1-2 righe) sono applicati
// nel superRefine del CarouselSchema per mantenere la compatibilita con
// z.discriminatedUnion (che richiede ZodObject puro, non ZodEffects).

const CoverSlideSchema = z.object({
  ...SlideBaseFields,
  type:             z.literal('cover'),
  size:             z.literal('cover'),
  lines:            z.array(z.string()),
  show_swipe_arrow: z.boolean().optional(),
})

const StandardSlideSchema = z.object({
  ...SlideBaseFields,
  type:  z.literal('standard'),
  size:  z.enum(['xl', 'lg', 'md']),
  lines: z.array(z.string()).min(1, 'Almeno 1 riga in lines e obbligatoria'),
})

const DividerSlideSchema = z.object({
  ...SlideBaseFields,
  type:           z.literal('divider'),
  size:           z.enum(['xl', 'lg', 'md']).optional(),
  lines:          z.array(z.string()).min(1).max(2),
  divider_number: z.string().min(1, 'divider_number e obbligatorio per le slide divider'),
  divider_label:  z.string().nullable().optional(),
})

const CtaSlideSchema = z.object({
  ...SlideBaseFields,
  type:      z.literal('cta'),
  size:      z.null().optional(),
  cta_items: z.array(z.string()).min(1, 'Almeno 1 item in cta_items e obbligatorio'),
})

const QuoteSlideSchema = z.object({
  ...SlideBaseFields,
  type:   z.literal('quote'),
  size:   z.enum(['xl', 'lg', 'md']),
  lines:  z.array(z.string()).min(1, 'Almeno 1 riga in lines e obbligatoria'),
  author: z.string().max(80, 'author: max 80 caratteri').nullable().optional(),
  source: z.string().max(120, 'source: max 120 caratteri').nullable().optional(),
})

const BlankSlideSchema = z.object({
  ...SlideBaseFields,
  type:             z.literal('blank'),
  caption:          z.string().max(200).optional(),
  caption_position: z.enum(['top', 'center', 'bottom']).optional(),
})

// ─── Unione discriminata ──────────────────────────────────────────────────────
const SlideSchema = z.discriminatedUnion('type', [
  CoverSlideSchema,
  StandardSlideSchema,
  DividerSlideSchema,
  CtaSlideSchema,
  QuoteSlideSchema,
  BlankSlideSchema,
])

// ─── AI generation metadata ───────────────────────────────────────────────────
export const AiGenerationSchema = z.object({
  model:          z.string().optional(),
  timestamp:      z.number().optional(),
  input_chars:    z.number().nullable().optional(),
  input_summary:  z.string().nullable().optional(),
  usage:          z.any().nullable().optional(),
  json_repaired:  z.enum(['none', 'local', 'llm']).nullable().optional(),
  generation_id:  z.string().optional(),
}).optional()

// ─── Carousel completo ────────────────────────────────────────────────────────
export const CarouselSchema = z
  .object({
    _schema:        z.object({ version: z.string(), description: z.string().optional() }).optional(),
    _ai_generation: AiGenerationSchema,
    title:          z.string().optional(),
    theme:          ThemeSchema,
    slides:         z.array(SlideSchema).min(1, 'Il carosello deve avere almeno 1 slide'),
  })
  .superRefine((data, ctx) => {
    data.slides.forEach((slide, idx) => {
      const path = ['slides', idx]

      // cover: esattamente 1 riga
      if (slide.type === 'cover' && slide.lines.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La slide cover deve avere esattamente 1 riga in lines',
          path: [...path, 'lines'],
        })
      }

      // divider: 1-2 righe
      if (slide.type === 'divider' && slide.lines.length > 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La slide divider puo avere al massimo 2 righe in lines',
          path: [...path, 'lines'],
        })
      }
    })

    // num non deve avere duplicati
    const nums = data.slides.map((s) => s.num)
    const duplicates = nums.filter((n, i) => nums.indexOf(n) !== i)
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `num duplicati: ${[...new Set(duplicates)].join(', ')}`,
        path: ['slides'],
      })
    }
  })

// ─── Export singoli schema ─────────────────────────────────────────────────
export { SlideSchema, ThemeSchema }
// PaletteSchema e gia esportato come named export sopra (retrocompatibilita)
