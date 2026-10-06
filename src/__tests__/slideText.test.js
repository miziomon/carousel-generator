import { describe, it, expect } from 'vitest'
import { stripInlineTags, slideToPlainText, carouselToPlainText } from '../lib/slideText.js'

const theme = { header: { kicker_default: 'Rubrica' } }

describe('stripInlineTags', () => {
  it('rimuove i tag appaiati', () => {
    expect(stripInlineTags('Ciao [hl]mondo[/hl] e [em]tutti[/em]')).toBe('Ciao mondo e tutti')
  })

  it('lascia letterali i tag non appaiati', () => {
    expect(stripInlineTags('[hl]aperto')).toBe('[hl]aperto')
    expect(stripInlineTags('chiuso[/u]')).toBe('chiuso[/u]')
  })

  it('gestisce stringhe vuote', () => {
    expect(stripInlineTags('')).toBe('')
    expect(stripInlineTags(undefined)).toBe('')
  })
})

describe('slideToPlainText', () => {
  it('usa il kicker di default del tema se la slide non lo definisce', () => {
    const slide = { type: 'standard', lines: ['Titolo'] }
    expect(slideToPlainText(slide, theme)).toBe('Rubrica\n\nTitolo')
  })

  it('rispetta kicker null (nascosto) e il kicker esplicito', () => {
    expect(slideToPlainText({ type: 'cover', kicker: null, lines: ['A'] }, theme)).toBe('A')
    expect(slideToPlainText({ type: 'cover', kicker: 'Mio', lines: ['A'] }, theme)).toBe('Mio\n\nA')
  })

  it('esclude i separatori e conserva le righe vuote', () => {
    const slide = { type: 'standard', kicker: null, lines: ['Uno', '[sep]', 'Due', '', 'Tre'] }
    expect(slideToPlainText(slide, theme)).toBe('Uno\nDue\n\nTre')
  })

  it('divider: numero, righe ed etichetta', () => {
    const slide = { type: 'divider', kicker: null, divider_number: '02', lines: ['Parte [hl]due[/hl]'], divider_label: 'Metodo' }
    expect(slideToPlainText(slide, theme)).toBe('02\n\nParte due\n\nMetodo')
  })

  it('cta: una voce per elemento', () => {
    const slide = { type: 'cta', kicker: null, cta_items: ['Seguimi', 'Condividi'] }
    expect(slideToPlainText(slide, theme)).toBe('Seguimi\n\nCondividi')
  })

  it('quote: autore e fonte', () => {
    const slide = { type: 'quote', kicker: null, lines: ['Una citazione'], author: 'Autore', source: 'Libro' }
    expect(slideToPlainText(slide, theme)).toBe('Una citazione\n\nAutore, Libro')
  })

  it('blank: solo la caption', () => {
    expect(slideToPlainText({ type: 'blank', kicker: null, caption: 'Didascalia' }, theme)).toBe('Didascalia')
    expect(slideToPlainText({ type: 'blank', kicker: null }, theme)).toBe('')
  })
})

describe('carouselToPlainText', () => {
  it('numera le slide e antepone il titolo', () => {
    const carousel = {
      title: 'Il mio carosello',
      theme,
      slides: [
        { type: 'cover', kicker: null, lines: ['Ciao'] },
        { type: 'cta', kicker: null, cta_items: ['Seguimi'] },
      ],
    }
    expect(carouselToPlainText(carousel)).toBe(
      'Il mio carosello\n\nSlide 1 di 2\nCiao\n\nSlide 2 di 2\nSeguimi'
    )
  })
})
