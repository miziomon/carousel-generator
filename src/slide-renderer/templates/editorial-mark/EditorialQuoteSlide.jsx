import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'

// Smart quotes: trasforma " ' diritti in tipografici curvi.
// Applicato a author/source (testo che mai contiene tag inline).
function smartQuotes(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/(^|[\s([{<])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{<])'/g, '$1‘')
    .replace(/'/g, '’')
}

export function EditorialQuoteSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'editorial__body--fraunces' : 'editorial__body--archivo'
  const sizeClass = slide.size ? `editorial__body--${slide.size}` : ''
  const bodyClass = `${fontClass} ${sizeClass} editorial__body--quote`.trim()

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>
        <div className="editorial__quote-text">
          <span className="editorial__qmark editorial__qmark--open" aria-hidden="true">{'“'}</span>
          {parseLines(slide.lines, `q-${slide.num}`, EDITORIAL_CLASS_MAP)}
          <span className="editorial__qmark editorial__qmark--close" aria-hidden="true">{'”'}</span>
        </div>
        {hasAttr && (
          <div className="editorial__quote-attr">
            {author && <span className="editorial__quote-attr-author">{`— ${author}`}</span>}
            {author && source && <br />}
            {source && <span className="editorial__quote-attr-source">{source}</span>}
          </div>
        )}
      </div>
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
