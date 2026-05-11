/**
 * Parser state-machine per i tag inline delle slide.
 * Produce un array di React nodes — mai dangerouslySetInnerHTML.
 *
 * Tag supportati:
 *   [hl]testo[/hl]    → <span className="hl-block">
 *   [soft]testo[/soft]→ <span className="hl-soft">
 *   [c]testo[/c]      → <span className="hl-color">
 *   [u]testo[/u]      → <span className="hl-under">
 *   [em]testo[/em]    → <em>
 */

import React from 'react'

const TAG_MAP = {
  hl: 'hl-block',
  soft: 'hl-soft',
  c: 'hl-color',
  u: 'hl-under',
}

// Tokenizza la stringa in parti: testo puro o tag aperto/chiuso
function tokenize(text) {
  const tokens = []
  // Matcha sia tag di apertura [tag] che di chiusura [/tag]
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
export function parseInlineTags(text, keyPrefix = '') {
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
      // Cerca il tag di chiusura corrispondente
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

      // Raccoglie il contenuto tra apertura e chiusura (solo testo per ora)
      const innerTokens = tokens.slice(i + 1, closeIndex)
      const innerText = innerTokens.map((t) => t.value ?? `[${t.type === 'close' ? '/' : ''}${t.tag}]`).join('')
      const key = `${keyPrefix}-${i}`

      if (token.tag === 'em') {
        nodes.push(<em key={key}>{innerText}</em>)
      } else {
        const cls = TAG_MAP[token.tag]
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
 */
export function parseLines(lines, keyPrefix = 'line') {
  if (!lines || lines.length === 0) return null

  const result = []

  lines.forEach((line, idx) => {
    const isLast = idx === lines.length - 1

    if (line === '') {
      // Riga vuota = spaziatura extra
      result.push(<br key={`${keyPrefix}-empty-${idx}`} />)
    } else {
      const nodes = parseInlineTags(line, `${keyPrefix}-${idx}`)
      result.push(...nodes)
    }

    if (!isLast) {
      result.push(<br key={`${keyPrefix}-br-${idx}`} />)
    }
  })

  return result
}
