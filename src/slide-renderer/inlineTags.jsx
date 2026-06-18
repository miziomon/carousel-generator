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
 * Converte l'array lines in un array flat di React nodes con <br> intercalati.
 * Una stringa vuota "" produce un <br> extra (spazio paragrafo).
 * L'ultima riga non ha <br> finale.
 *
 * Se `aligns` è presente (allineamento per-riga, parallelo a `lines`), ogni riga
 * viene invece wrappata in un <div> block con `text-align`: serve un contenitore
 * block perché text-align non ha effetto su nodi inline. Indici mancanti ⇒ 'left'.
 * Quando `aligns` è assente il comportamento resta identico (path <br>): le slide
 * esistenti non subiscono alcuna regressione.
 */
export function parseLines(lines, keyPrefix = 'line', classMap = DEFAULT_CLASS_MAP, aligns) {
  if (!lines || lines.length === 0) return null

  // Path con allineamento per-riga: un <div> per riga con text-align inline.
  if (aligns) {
    return lines.map((line, idx) => {
      const textAlign = aligns[idx] ?? 'left'
      // riga vuota → <br> interno per preservare l'altezza (spazio paragrafo)
      const content = line === ''
        ? <br />
        : parseInlineTags(line, `${keyPrefix}-${idx}`, classMap)
      return (
        <div key={`${keyPrefix}-line-${idx}`} style={{ textAlign }}>
          {content}
        </div>
      )
    })
  }

  // Path classico: righe in flusso unico con <br> intercalati.
  const result = []

  lines.forEach((line, idx) => {
    const isLast = idx === lines.length - 1

    if (line === '') {
      result.push(<br key={`${keyPrefix}-empty-${idx}`} />)
    } else {
      const nodes = parseInlineTags(line, `${keyPrefix}-${idx}`, classMap)
      result.push(...nodes)
    }

    if (!isLast) {
      result.push(<br key={`${keyPrefix}-br-${idx}`} />)
    }
  })

  return result
}
