import { z } from 'zod'
import { SlideSchema } from '../schema.js'

const GeneratedCarouselSchema = z.object({
  _ai_generation: z.any().optional(),
  theme: z.any().optional(),
  slides: z.array(SlideSchema).min(1, 'Il carosello deve avere almeno 1 slide'),
})

export function validateCarouselForReplacement(rawCarousel) {
  const result = GeneratedCarouselSchema.safeParse(rawCarousel)

  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    }
  }

  // Vincoli cross-campo (replicati da CarouselSchema.superRefine)
  const crossErrors = []
  const slides = result.data.slides

  slides.forEach((slide, idx) => {
    if (slide.type === 'cover' && slide.lines.length !== 1) {
      crossErrors.push({ path: `slides.${idx}.lines`, message: 'La slide cover deve avere esattamente 1 riga in lines' })
    }
    if (slide.type === 'divider' && slide.lines.length > 2) {
      crossErrors.push({ path: `slides.${idx}.lines`, message: 'La slide divider può avere al massimo 2 righe in lines' })
    }
  })

  const nums = slides.map((s) => s.num)
  const duplicates = nums.filter((n, i) => nums.indexOf(n) !== i)
  if (duplicates.length > 0) {
    crossErrors.push({ path: 'slides', message: `num duplicati: ${[...new Set(duplicates)].join(', ')}` })
  }

  if (crossErrors.length > 0) {
    return { ok: false, errors: crossErrors }
  }

  return { ok: true, data: result.data }
}
