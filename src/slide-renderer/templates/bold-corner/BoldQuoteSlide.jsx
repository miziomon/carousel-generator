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

export function BoldQuoteSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'bold__body--fraunces' : 'bold__body--archivo'
  const sizeClass = slide.size ? `bold__body--${slide.size}` : ''
  const bodyClass = `${fontClass} ${sizeClass} bold__body--quote`.trim()

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>
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
