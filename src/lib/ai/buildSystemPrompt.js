import { SYSTEM_PROMPT_TEMPLATE } from './systemPrompt.js'

export function buildSystemPrompt(currentCarousel) {
  const fewShotBlock = formatFewShotBlock(currentCarousel)
  return SYSTEM_PROMPT_TEMPLATE.replace('{{USER_PAST_CAROUSELS_JSON}}', fewShotBlock)
}

function formatFewShotBlock(carousel) {
  if (!carousel || !carousel.slides || carousel.slides.length < 3) {
    return '(nessun carosello passato disponibile)'
  }

  const STRIP_KEYS = new Set(['_note_autore', '_ai_generation', 'id'])
  const cleaned = {
    slides: carousel.slides.map((s) =>
      Object.fromEntries(Object.entries(s).filter(([k]) => !STRIP_KEYS.has(k)))
    ),
  }

  return `Ecco l'ultimo carosello prodotto dall'utente (usalo come riferimento di stile):

\`\`\`json
${JSON.stringify(cleaned, null, 2)}
\`\`\``
}
