import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines, parseInlineTags, isSeparator, rowClassName } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'
import { computeBodyFont } from '../_shared/bodyFont.js'
import { buildBodyStyle } from '../_shared/bodyStyle.js'

// Smart quotes: converte " e ' dritti in tipografici curvi.
// String.fromCharCode evita problemi di encoding nel sorgente con esbuild.
const DQ_OPEN  = String.fromCharCode(0x201C)
const DQ_CLOSE = String.fromCharCode(0x201D)
const SQ_OPEN  = String.fromCharCode(0x2018)
const SQ_CLOSE = String.fromCharCode(0x2019)
const EM_DASH  = String.fromCharCode(0x2014)

function smartQuotes(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/(^|[\s([{<])"/g, `$1${DQ_OPEN}`)
    .replace(/"/g, DQ_CLOSE)
    .replace(/(^|[\s([{<])'/g, `$1${SQ_OPEN}`)
    .replace(/'/g, SQ_CLOSE)
}

export function EditorialQuoteSlide({ slide, theme, total, calib }) {
  const sizeKey = slide.size || 'xl'
  const { finalSize, finalLH, fontVars } = computeBodyFont(slide, theme, calib, sizeKey)
  const bodyStyle = buildBodyStyle('editorial', { finalSize, finalLH, fontVars, slide })

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  // Indici della prima/ultima riga di testo (i separatori non portano le virgolette)
  const firstTextIdx = slide.lines.findIndex((l) => !isSeparator(l))
  const lastTextIdx = slide.lines.length - 1 - [...slide.lines].reverse().findIndex((l) => !isSeparator(l))

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={`editorial__body editorial__body--${sizeKey} editorial__body--quote`} style={bodyStyle}>
        <div className="editorial__quote-text">
          {slide.lines_align
            ? // Allineamento per-riga: ogni riga è un blocco; le virgolette restano
              // attaccate al testo entrando nel primo/ultimo blocco (le qmark sono
              // inline-block e fuori dai div finirebbero su righe separate).
              slide.lines.map((line, idx) => {
                const rowCls = rowClassName(slide.num, idx)

                // separatore → spacer block, senza div di allineamento né virgolette
                if (isSeparator(line)) {
                  return (
                    <span
                      key={`q-${slide.num}-line-${idx}`}
                      className={`${rowCls} ${EDITORIAL_CLASS_MAP.sep}`}
                      aria-hidden="true"
                    />
                  )
                }

                const textAlign = slide.lines_align[idx] ?? 'left'
                // le virgolette vanno sulla prima/ultima riga che non è un separatore
                const isFirst = idx === firstTextIdx
                const isLast = idx === lastTextIdx
                return (
                  <div key={`q-${slide.num}-line-${idx}`} style={{ textAlign }}>
                    {isFirst && (
                      <span className="editorial__qmark editorial__qmark--open" aria-hidden="true">{DQ_OPEN}</span>
                    )}
                    <span className={rowCls}>
                      {line === '' ? <br /> : parseInlineTags(line, `q-${slide.num}-${idx}`, EDITORIAL_CLASS_MAP)}
                    </span>
                    {isLast && (
                      <span className="editorial__qmark editorial__qmark--close" aria-hidden="true">{DQ_CLOSE}</span>
                    )}
                  </div>
                )
              })
            : (
              <>
                <span className="editorial__qmark editorial__qmark--open" aria-hidden="true">{DQ_OPEN}</span>
                {parseLines(slide.lines, `q-${slide.num}`, EDITORIAL_CLASS_MAP, undefined, slide.num)}
                <span className="editorial__qmark editorial__qmark--close" aria-hidden="true">{DQ_CLOSE}</span>
              </>
            )}
        </div>
        {hasAttr && (
          <div className="editorial__quote-attr">
            {author && <span className="editorial__quote-attr-author">{`${EM_DASH} ${author}`}</span>}
            {author && source && <br />}
            {source && <span className="editorial__quote-attr-source">{source}</span>}
          </div>
        )}
      </div>
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
