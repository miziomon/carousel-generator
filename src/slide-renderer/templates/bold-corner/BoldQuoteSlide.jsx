import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'
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

export function BoldQuoteSlide({ slide, theme, total, calib }) {
  const fontVars = resolveSlideFont(slide, theme)
  const sizeKey  = slide.size || 'xl'
  const entry    = calib.body_archivo[sizeKey] ?? calib.body_archivo.xl
  const mdSize   = calib.body_archivo.md.size
  const base     = parseFloat(fontVars['--font-size-base'])
  const ratio    = entry.size / mdSize

  const finalSize = Math.round(base * ratio * parseFloat(fontVars['--font-size-multiplier']))
  const finalLH   = +(entry.line_height * parseFloat(fontVars['--font-line-height-multiplier'])).toFixed(3)

  const bodyStyle = {
    '--bold-body-size':        `${finalSize}px`,
    '--bold-body-line-height': finalLH,
    ...fontVars,
  }

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={`bold__body bold__body--${sizeKey} bold__body--quote`} style={bodyStyle}>
        <div className="bold__quote-text">
          {parseLines(slide.lines, `bc-q-${slide.num}`, BOLD_CLASS_MAP)}
        </div>
        {hasAttr && (
          <div className="bold__quote-attr">
            {author && <span className="bold__quote-attr-author">{`${EM_DASH} ${author}`}</span>}
            {author && source && <br />}
            {source && <span className="bold__quote-attr-source">{source}</span>}
          </div>
        )}
      </div>
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
