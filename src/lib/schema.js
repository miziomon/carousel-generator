import { z } from 'zod'

// ─── Palette ─────────────────────────────────────────────────────────────────
const PaletteSchema = z.object({
  background: z.string().min(1),
  foreground: z.string().min(1),
  accent: z.string().min(1),
  muted: z.string().min(1),
  line: z.string().min(1),
})

// ─── Theme ────────────────────────────────────────────────────────────────────
const ThemeSchema = z.object({
  palette: PaletteSchema,
  header: z.object({
    kicker_default: z.string(),
    show_topline: z.boolean(),
    show_dot: z.boolean(),
  }),
  footer: z.object({
    name: z.string(),
    show_separator_line: z.boolean(),
    show_meta_number: z.boolean(),
  }),
  fonts: z.object({
    primary: z.string(),
    secondary: z.string(),
    mono: z.string(),
  }),
})

// ─── Base fields comuni a tutti i tipi ───────────────────────────────────────
const SlideBaseFields = {
  num: z.number().int().positive(),
  kicker: z.string().nullable().optional(),
  font: z.enum(['archivo', 'fraunces']),
  _note_autore: z.string().optional(),
}

// ─── Schema per tipo (senza superRefine: discriminatedUnion lo richiede) ────
// I vincoli per-tipo (cover→1 riga, divider→1-2 righe, ecc.) sono applicati
// nel superRefine del CarouselSchema per mantenere la compatibilità con
// z.discriminatedUnion (che richiede ZodObject puro, non ZodEffects).

const CoverSlideSchema = z.object({
  ...SlideBaseFields,
  type: z.literal('cover'),
  size: z.literal('cover'),
  lines: z.array(z.string()),
  show_swipe_arrow: z.boolean().optional(),
})

const StandardSlideSchema = z.object({
  ...SlideBaseFields,
  type: z.literal('standard'),
  size: z.enum(['xl', 'lg', 'md']),
  lines: z.array(z.string()).min(1, 'Almeno 1 riga in lines è obbligatoria'),
})

const DividerSlideSchema = z.object({
  ...SlideBaseFields,
  type: z.literal('divider'),
  size: z.enum(['xl', 'lg', 'md']).optional(),
  lines: z.array(z.string()).min(1).max(2),
  divider_number: z.string().min(1, 'divider_number è obbligatorio per le slide divider'),
  divider_label: z.string().nullable().optional(),
})

const CtaSlideSchema = z.object({
  ...SlideBaseFields,
  type: z.literal('cta'),
  size: z.null().optional(),
  cta_items: z.array(z.string()).min(1, 'Almeno 1 item in cta_items è obbligatorio'),
})

// ─── Unione discriminata ──────────────────────────────────────────────────────
const SlideSchema = z.discriminatedUnion('type', [
  CoverSlideSchema,
  StandardSlideSchema,
  DividerSlideSchema,
  CtaSlideSchema,
])

// ─── Carousel completo ────────────────────────────────────────────────────────
export const CarouselSchema = z
  .object({
    _schema: z.object({ version: z.string(), description: z.string().optional() }).optional(),
    title: z.string().optional(),   // nome del progetto (solo UI, non appare nelle slide)
    theme: ThemeSchema,
    slides: z.array(SlideSchema).min(1, 'Il carosello deve avere almeno 1 slide'),
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
          message: 'La slide divider può avere al massimo 2 righe in lines',
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
export { SlideSchema, ThemeSchema, PaletteSchema }
