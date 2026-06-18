import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'
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

export function BoldQuoteSlide({ slide, theme, total, calib }) {
  const sizeKey = slide.size || 'xl'
  const { finalSize, finalLH, fontVars } = computeBodyFont(slide, theme, calib, sizeKey)
  const bodyStyle = buildBodyStyle('bold', { finalSize, finalLH, fontVars, slide })

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={`bold__body bold__body--${sizeKey} bold__body--quote`} style={bodyStyle}>
        <div className="bold__quote-text">
          {parseLines(slide.lines, `bc-q-${slide.num}`, BOLD_CLASS_MAP, slide.lines_align)}
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
