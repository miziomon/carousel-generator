import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'

// Smart quotes — stessa logica del template Editorial
function smartQuotes(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/(^|[\s([{<])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{<])'/g, '$1‘')
    .replace(/'/g, '’')
}

export function BoldQuoteSlide({ slide, theme, total, calib }) {
  const isFraunces = slide.font === 'fraunces'
  const fontClass  = isFraunces ? 'bold__body--fraunces' : 'bold__body--archivo'
  const sizeKey    = slide.size || 'xl'
  const sizeClass  = sizeKey ? `bold__body--${sizeKey}` : ''
  const bodyClass  = `${fontClass} ${sizeClass} bold__body--quote`.trim()

  const bodyCalib = isFraunces
    ? (calib.body_fraunces[sizeKey] ?? calib.body_fraunces.xl)
    : (calib.body_archivo[sizeKey]  ?? calib.body_archivo.xl)

  const bodyStyle = {
    '--bold-body-size':        `${bodyCalib.size}px`,
    '--bold-body-line-height': bodyCalib.line_height,
  }

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass} style={bodyStyle}>
        <div className="bold__quote-text">
          {parseLines(slide.lines, `bc-q-${slide.num}`, BOLD_CLASS_MAP)}
        </div>
        {hasAttr && (
          <div className="bold__quote-attr">
            {author && <span className="bold__quote-attr-author">{`— ${author}`}</span>}
            {author && source && <br />}
            {source && <span className="bold__quote-attr-source">{source}</span>}
          </div>
        )}
      </div>
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
