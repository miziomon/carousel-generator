const INLINE_TAG_RE = /\[\/?(?:hl|soft|c|u|em)\]/g

/**
 * Suggerisce un titolo per il carosello, cercando in ordine:
 * 1. carousel.title (se valorizzato)
 * 2. _ai_generation.input_summary
 * 3. Testo della prima slide (strip dei tag inline)
 * 4. Fallback: data odierna
 */
export function suggestTitle(carousel) {
  if (carousel.title?.trim()) return carousel.title.trim().slice(0, 80)

  const summary = carousel._ai_generation?.input_summary?.trim()
  if (summary) return summary.slice(0, 80)

  const firstSlide = carousel.slides?.[0]
  if (firstSlide?.lines?.length) {
    const raw = firstSlide.lines.join(' ')
    const cleaned = raw.replace(INLINE_TAG_RE, '').replace(/\s+/g, ' ').trim()
    if (cleaned) return cleaned.slice(0, 80)
  }

  return `Carosello del ${new Date().toLocaleDateString('it-IT')}`
}
