/**
 * Parser state-machine per i tag inline delle slide.
 * Produce un array di React nodes — mai dangerouslySetInnerHTML.
 *
 * Tag supportati:
 *   [hl]testo[/hl]    → <span className={classMap.hl}>
 *   [soft]testo[/soft]→ <span className={classMap.soft}>
 *   [c]testo[/c]      → <span className={classMap.c}>
 *   [u]testo[/u]      → <span className={classMap.u}>
 *   [em]testo[/em]    → <em> (sempre, indipendente da classMap)
 *
 * Ogni template passa il proprio classMap per produrre classi namespaced.
 * Il DEFAULT_CLASS_MAP usa le classi "hl-block" ecc. per retrocompatibilità
 * con i test e con eventuali chiamate esterne.
 */

import React from 'react'

export const DEFAULT_CLASS_MAP = {
  hl:   'hl-block',
  soft: 'hl-soft',
  c:    'hl-color',
  u:    'hl-under',
  sep:  'line-separator',
}

// Tokenizza la stringa in parti: testo puro o tag aperto/chiuso
function tokenize(text) {
  const tokens = []
  const re = /\[(\/?)(hl|soft|c|u|em)\]/g
  let lastIndex = 0
  let match

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    const isClose = match[1] === '/'
    tokens.push({ type: isClose ? 'close' : 'open', tag: match[2] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return tokens
}

// Converte i token in React nodes. Tag non chiusi vengono emessi come testo.
export function parseInlineTags(text, keyPrefix = '', classMap = DEFAULT_CLASS_MAP) {
  if (!text) return []
  const tokens = tokenize(text)
  const nodes = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'text') {
      nodes.push(token.value)
      i++
      continue
    }

    if (token.type === 'open') {
      let closeIndex = -1
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'close' && tokens[j].tag === token.tag) {
          closeIndex = j
          break
        }
      }

      if (closeIndex === -1) {
        // Tag aperto senza chiusura → emetti come testo letterale
        nodes.push(`[${token.tag}]`)
        i++
        continue
      }

      const innerTokens = tokens.slice(i + 1, closeIndex)
      const innerText = innerTokens.map((t) => t.value ?? `[${t.type === 'close' ? '/' : ''}${t.tag}]`).join('')
      const key = `${keyPrefix}-${i}`

      if (token.tag === 'em') {
        nodes.push(<em key={key}>{innerText}</em>)
      } else {
        const cls = classMap[token.tag]
        nodes.push(
          <span key={key} className={cls}>
            {innerText}
          </span>
        )
      }

      i = closeIndex + 1
      continue
    }

    // Token close orfano → testo letterale
    if (token.type === 'close') {
      nodes.push(`[/${token.tag}]`)
      i++
    }
  }

  return nodes
}

/**
 * Valore sentinella nell'array `lines` che rappresenta un separatore:
 * uno spazio verticale vuoto, alto per default metà della dimensione del testo.
 */
export const SEPARATOR_TOKEN = '[sep]'

export function isSeparator(line) {
  return typeof line === 'string' && line.trim() === SEPARATOR_TOKEN
}

// Zero-padding a 2 cifre per le classi BEM posizionali (es. 1 → "01")
const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Classi BEM della riga: `slide-row` (comune) + `slide_NN_row_MM` (posizionale).
 * L'indice è la posizione nell'array lines (righe vuote e separatori inclusi).
 * Senza `slideNum` resta solo la classe comune.
 */
export function rowClassName(slideNum, idx) {
  if (slideNum === undefined || slideNum === null) return 'slide-row'
  return `slide-row slide_${pad2(slideNum)}_row_${pad2(idx + 1)}`
}

/**
 * Converte l'array lines in un array flat di React nodes, ogni riga dentro uno <span>
 * con classi BEM (vedi rowClassName), con <br> intercalati.
 * Una stringa vuota "" produce un <br> extra (spazio paragrafo).
 * L'ultima riga non ha <br> finale.
 * La voce SEPARATOR_TOKEN produce uno <span> block (spacer) che va a capo da solo:
 * per questo non ha <br> adiacenti.
 *
 * Se `aligns` è presente (allineamento per-riga, parallelo a `lines`), ogni riga
 * viene invece wrappata in un <div> block con `text-align`: serve un contenitore
 * block perché text-align non ha effetto su nodi inline. Indici mancanti ⇒ 'left'.
 * Quando `aligns` è assente si usa il path <br>.
 */
export function parseLines(lines, keyPrefix = 'line', classMap = DEFAULT_CLASS_MAP, aligns, slideNum) {
  if (!lines || lines.length === 0) return null

  const sepClass = classMap.sep ?? DEFAULT_CLASS_MAP.sep

  // Path con allineamento per-riga: un <div> per riga con text-align inline.
  if (aligns) {
    return lines.map((line, idx) => {
      const rowCls = rowClassName(slideNum, idx)

      // separatore → spacer block, senza div di allineamento
      if (isSeparator(line)) {
        return <span key={`${keyPrefix}-line-${idx}`} className={`${rowCls} ${sepClass}`} aria-hidden="true" />
      }

      const textAlign = aligns[idx] ?? 'left'
      // riga vuota → <br> interno per preservare l'altezza (spazio paragrafo)
      const content = line === ''
        ? <br />
        : parseInlineTags(line, `${keyPrefix}-${idx}`, classMap)
      return (
        <div key={`${keyPrefix}-line-${idx}`} style={{ textAlign }}>
          <span className={rowCls}>{content}</span>
        </div>
      )
    })
  }

  // Path classico: righe in flusso unico con <br> intercalati.
  const result = []

  lines.forEach((line, idx) => {
    const isLast = idx === lines.length - 1
    const rowCls = rowClassName(slideNum, idx)

    if (isSeparator(line)) {
      // il blocco va a capo da solo: nessun <br> prima né dopo
      result.push(<span key={`${keyPrefix}-row-${idx}`} className={`${rowCls} ${sepClass}`} aria-hidden="true" />)
      return
    }

    const content = line === ''
      ? <br />
      : parseInlineTags(line, `${keyPrefix}-${idx}`, classMap)
    result.push(<span key={`${keyPrefix}-row-${idx}`} className={rowCls}>{content}</span>)

    // niente <br> dopo l'ultima riga né prima di un separatore (già block)
    if (!isLast && !isSeparator(lines[idx + 1])) {
      result.push(<br key={`${keyPrefix}-br-${idx}`} />)
    }
  })

  return result
}
