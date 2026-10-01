import { describe, it, expect } from 'vitest'
import { parseInlineTags, parseLines, isSeparator, DEFAULT_CLASS_MAP } from '../slide-renderer/inlineTags.jsx'

describe('parseInlineTags', () => {
  it('restituisce testo puro senza tag', () => {
    const result = parseInlineTags('ciao mondo')
    expect(result).toEqual(['ciao mondo'])
  })

  it('parsea [hl]...[/hl] come span.hl-block', () => {
    const result = parseInlineTags('testo [hl]verde[/hl] fine')
    expect(result).toHaveLength(3)
    expect(result[0]).toBe('testo ')
    expect(result[1].type).toBe('span')
    expect(result[1].props.className).toBe('hl-block')
    expect(result[1].props.children).toBe('verde')
    expect(result[2]).toBe(' fine')
  })

  it('parsea [soft]...[/soft] come span.hl-soft', () => {
    const result = parseInlineTags('[soft]crema[/soft]')
    expect(result[0].props.className).toBe('hl-soft')
  })

  it('parsea [c]...[/c] come span.hl-color', () => {
    const result = parseInlineTags('[c]colorato[/c]')
    expect(result[0].props.className).toBe('hl-color')
  })

  it('parsea [u]...[/u] come span.hl-under', () => {
    const result = parseInlineTags('[u]sottolineato[/u]')
    expect(result[0].props.className).toBe('hl-under')
  })

  it('parsea [em]...[/em] come em', () => {
    const result = parseInlineTags('[em]corsivo[/em]')
    expect(result[0].type).toBe('em')
    expect(result[0].props.children).toBe('corsivo')
  })

  it('tratta tag aperto senza chiusura come testo letterale', () => {
    const result = parseInlineTags('[hl]testo senza chiusura')
    expect(result[0]).toBe('[hl]')
    expect(result[1]).toBe('testo senza chiusura')
  })

  it('tratta tag chiuso orfano come testo letterale', () => {
    const result = parseInlineTags('testo [/hl] fine')
    expect(result).toContain('[/hl]')
  })

  it('gestisce stringa vuota', () => {
    expect(parseInlineTags('')).toEqual([])
    expect(parseInlineTags(null)).toEqual([])
  })

  it('parsea più tag consecutivi', () => {
    const result = parseInlineTags('[hl]A[/hl][c]B[/c]')
    expect(result).toHaveLength(2)
    expect(result[0].props.className).toBe('hl-block')
    expect(result[1].props.className).toBe('hl-color')
  })
})

describe('parseInlineTags — classMap personalizzato', () => {
  const CUSTOM_MAP = {
    hl:   'editorial__hl-block',
    soft: 'editorial__hl-soft',
    c:    'editorial__hl-color',
    u:    'editorial__hl-under',
  }

  it('usa classMap custom per le classi degli span', () => {
    const result = parseInlineTags('[hl]verde[/hl]', '', CUSTOM_MAP)
    expect(result[0].props.className).toBe('editorial__hl-block')
  })

  it('usa classMap custom per tutti i tag supportati', () => {
    const result = parseInlineTags('[soft]a[/soft][c]b[/c][u]c[/u]', '', CUSTOM_MAP)
    expect(result[0].props.className).toBe('editorial__hl-soft')
    expect(result[1].props.className).toBe('editorial__hl-color')
    expect(result[2].props.className).toBe('editorial__hl-under')
  })

  it('[em] usa sempre <em> indipendentemente dal classMap', () => {
    const result = parseInlineTags('[em]corsivo[/em]', '', CUSTOM_MAP)
    expect(result[0].type).toBe('em')
  })

  it('senza classMap usa DEFAULT_CLASS_MAP (retrocompatibilità)', () => {
    const result = parseInlineTags('[hl]default[/hl]')
    expect(result[0].props.className).toBe(DEFAULT_CLASS_MAP.hl)
  })
})

describe('parseLines', () => {
  it('intercala <br> tra le righe', () => {
    const result = parseLines(['riga1', 'riga2'])
    // riga1, <br>, riga2 → 3 elementi (testo + br + testo)
    expect(result).toHaveLength(3)
    expect(result[1].type).toBe('br')
  })

  it('riga vuota produce <br> extra', () => {
    const result = parseLines(['riga1', '', 'riga3'])
    // span(riga1), <br>, span(<br> da stringa vuota), <br>, span(riga3)
    expect(result.filter((n) => n?.type === 'br')).toHaveLength(2)
    expect(result[2].props.children.type).toBe('br')
  })

  it("l'ultima riga non ha <br> finale", () => {
    const result = parseLines(['ultima'])
    const brCount = result.filter((n) => n?.type === 'br').length
    expect(brCount).toBe(0)
  })

  it('restituisce null per array vuoto', () => {
    expect(parseLines([])).toBeNull()
    expect(parseLines(null)).toBeNull()
  })
})

describe('parseLines — allineamento per-riga (aligns)', () => {
  it('senza aligns mantiene il comportamento <br> (retrocompatibilità)', () => {
    const result = parseLines(['riga1', 'riga2'])
    expect(result).toHaveLength(3)
    expect(result[1].type).toBe('br')
  })

  it('con aligns wrappa ogni riga in un <div> con textAlign', () => {
    const result = parseLines(['riga1', 'riga2'], 'k', DEFAULT_CLASS_MAP, ['center', 'right'])
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('div')
    expect(result[0].props.style.textAlign).toBe('center')
    expect(result[1].type).toBe('div')
    expect(result[1].props.style.textAlign).toBe('right')
  })

  it('riga vuota nel path aligns produce un <div> con <br> interno', () => {
    const result = parseLines(['riga1', ''], 'k', DEFAULT_CLASS_MAP, ['left', 'left'])
    expect(result[1].type).toBe('div')
    // div > span.slide-row > <br>
    expect(result[1].props.children.props.children.type).toBe('br')
  })

  it('indici di aligns mancanti usano il default "left"', () => {
    const result = parseLines(['a', 'b', 'c'], 'k', DEFAULT_CLASS_MAP, ['right'])
    expect(result[0].props.style.textAlign).toBe('right')
    expect(result[1].props.style.textAlign).toBe('left')
    expect(result[2].props.style.textAlign).toBe('left')
  })

  it('preserva i tag inline dentro il div allineato', () => {
    const result = parseLines(['testo [hl]verde[/hl]'], 'k', DEFAULT_CLASS_MAP, ['center'])
    // div > span.slide-row > parseInlineTags (array: ['testo ', <span.hl-block>])
    const children = result[0].props.children.props.children
    expect(Array.isArray(children)).toBe(true)
    expect(children[1].props.className).toBe('hl-block')
  })
})

describe('parseLines — classi BEM per-riga e separatore', () => {
  it('assegna slide-row + slide_NN_row_MM con zero-padding (path classico)', () => {
    const result = parseLines(['a', 'b', 'c'], 'k', DEFAULT_CLASS_MAP, undefined, 2)
    const rows = result.filter((n) => n?.type === 'span')
    expect(rows.map((r) => r.props.className)).toEqual([
      'slide-row slide_02_row_01',
      'slide-row slide_02_row_02',
      'slide-row slide_02_row_03',
    ])
  })

  it('assegna le stesse classi nel path con aligns', () => {
    const result = parseLines(['a', 'b'], 'k', DEFAULT_CLASS_MAP, ['left', 'left'], 11)
    expect(result[0].props.children.props.className).toBe('slide-row slide_11_row_01')
    expect(result[1].props.children.props.className).toBe('slide-row slide_11_row_02')
  })

  it('senza slideNum resta solo la classe comune', () => {
    const result = parseLines(['a'])
    expect(result[0].props.className).toBe('slide-row')
  })

  it('[sep] produce uno span con classMap.sep, senza <br> adiacenti', () => {
    const result = parseLines(['a', '[sep]', 'b'], 'k', { ...DEFAULT_CLASS_MAP, sep: 'x__sep' }, undefined, 1)
    // span(a), span.sep, span(b): nessun <br> prima o dopo il separatore
    expect(result).toHaveLength(3)
    expect(result.some((n) => n?.type === 'br')).toBe(false)
    expect(result[1].props.className).toBe('slide-row slide_01_row_02 x__sep')
  })

  it('[sep] nel path aligns è uno span diretto, senza div', () => {
    const result = parseLines(['a', '[sep]'], 'k', DEFAULT_CLASS_MAP, ['left', 'left'], 1)
    expect(result[1].type).toBe('span')
    expect(result[1].props.className).toContain(DEFAULT_CLASS_MAP.sep)
  })

  it('la numerazione è posizionale: righe vuote e separatori contano', () => {
    const result = parseLines(['a', '', '[sep]', 'b'], 'k', DEFAULT_CLASS_MAP, undefined, 1)
    const rows = result.filter((n) => n?.type === 'span')
    expect(rows[3].props.className).toBe('slide-row slide_01_row_04')
  })

  it('isSeparator riconosce solo la sentinella', () => {
    expect(isSeparator('[sep]')).toBe(true)
    expect(isSeparator(' [sep] ')).toBe(true)
    expect(isSeparator('testo')).toBe(false)
    expect(isSeparator('')).toBe(false)
  })
})
