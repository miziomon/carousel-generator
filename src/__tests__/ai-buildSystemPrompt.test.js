import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../lib/ai/buildSystemPrompt.js'

const makeSlide = (overrides = {}) => ({
  type: 'standard',
  num: 1,
  size: 'lg',
  font: 'archivo',
  lines: ['Testo'],
  ...overrides,
})

// Estrae il JSON dal blocco few-shot (anchored alla frase di riferimento)
function extractFewShotJson(result) {
  const match = result.match(/riferimento di stile[^`]+```json\n([\s\S]+?)\n```/)
  return match ? JSON.parse(match[1]) : null
}

describe('buildSystemPrompt', () => {
  it('sostituisce il placeholder nel template', () => {
    const carousel = { slides: [makeSlide({ num: 1 }), makeSlide({ num: 2 }), makeSlide({ num: 3 })] }
    const result = buildSystemPrompt(carousel)
    expect(result).not.toContain('{{USER_PAST_CAROUSELS_JSON}}')
  })

  it('carosello con ≥3 slide → include JSON del carosello', () => {
    const carousel = {
      slides: [makeSlide({ num: 1 }), makeSlide({ num: 2 }), makeSlide({ num: 3 })],
    }
    const result = buildSystemPrompt(carousel)
    expect(result).toContain('riferimento di stile')
    const json = extractFewShotJson(result)
    expect(json).not.toBeNull()
    expect(json.slides).toHaveLength(3)
  })

  it('carosello con <3 slide → placeholder vuoto', () => {
    const carousel = { slides: [makeSlide({ num: 1 }), makeSlide({ num: 2 })] }
    const result = buildSystemPrompt(carousel)
    expect(result).toContain('nessun carosello passato disponibile')
  })

  it('carosello null → placeholder vuoto', () => {
    const result = buildSystemPrompt(null)
    expect(result).toContain('nessun carosello passato disponibile')
  })

  it('strip di _note_autore dalle slide nel few-shot JSON', () => {
    const carousel = {
      slides: [
        makeSlide({ num: 1, _note_autore: 'nota privata' }),
        makeSlide({ num: 2 }),
        makeSlide({ num: 3 }),
      ],
    }
    const result = buildSystemPrompt(carousel)
    expect(result).not.toContain('nota privata')
    const json = extractFewShotJson(result)
    json.slides.forEach((s) => {
      expect(s).not.toHaveProperty('_note_autore')
    })
  })

  it('strip di _ai_generation dalle slide nel few-shot JSON', () => {
    const carousel = {
      slides: [
        makeSlide({ num: 1, _ai_generation: { model: 'gemini', timestamp: 123 } }),
        makeSlide({ num: 2 }),
        makeSlide({ num: 3 }),
      ],
    }
    const result = buildSystemPrompt(carousel)
    const json = extractFewShotJson(result)
    json.slides.forEach((s) => {
      expect(s).not.toHaveProperty('_ai_generation')
    })
  })

  it('strip del campo id dalle slide nel few-shot JSON', () => {
    const carousel = {
      slides: [
        makeSlide({ num: 1, id: 'abc123' }),
        makeSlide({ num: 2, id: 'def456' }),
        makeSlide({ num: 3, id: 'ghi789' }),
      ],
    }
    const out = buildSystemPrompt(carousel)
    expect(out).not.toContain('abc123')
    const json = extractFewShotJson(out)
    json.slides.forEach((s) => {
      expect(s).not.toHaveProperty('id')
    })
  })
})
