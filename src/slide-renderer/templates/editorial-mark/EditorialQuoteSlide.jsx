import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'
import { resolveSlideFont } from '../../../lib/fonts/resolveFont.js'

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
  const fontVars = resolveSlideFont(slide, theme)
  const sizeKey  = slide.size || 'xl'
  const entry    = calib.body_archivo[sizeKey] ?? calib.body_archivo.xl
  const mdSize   = calib.body_archivo.md.size
  const base     = parseFloat(fontVars['--font-size-base'])
  const ratio    = entry.size / mdSize

  const finalSize = Math.round(base * ratio * parseFloat(fontVars['--font-size-multiplier']))
  const finalLH   = +(entry.line_height * parseFloat(fontVars['--font-line-height-multiplier'])).toFixed(3)

  const bodyStyle = {
    '--editorial-body-size':        `${finalSize}px`,
    '--editorial-body-line-height': finalLH,
    ...fontVars,
  }

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={`editorial__body editorial__body--${sizeKey} editorial__body--quote`} style={bodyStyle}>
        <div className="editorial__quote-text">
          <span className="editorial__qmark editorial__qmark--open" aria-hidden="true">{DQ_OPEN}</span>
          {parseLines(slide.lines, `q-${slide.num}`, EDITORIAL_CLASS_MAP)}
          <span className="editorial__qmark editorial__qmark--close" aria-hidden="true">{DQ_CLOSE}</span>
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
