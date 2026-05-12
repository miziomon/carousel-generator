import { SlideHeader } from './_SlideHeader.jsx'
import { SlideFooter } from './_SlideFooter.jsx'
import { parseLines } from '../inlineTags.jsx'

// Smart quotes: trasforma " ' diritti in tipografici curvi.
// Applicato a author/source (testo che mai contiene tag inline).
function smartQuotes(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/(^|[\s([{<])"/g, '$1“')   // " di apertura → "
    .replace(/"/g, '”')                  // " rimanenti → "
    .replace(/(^|[\s([{<])'/g, '$1‘')   // ' di apertura → '
    .replace(/'/g, '’')                  // ' rimanenti → '
}

export function QuoteSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'slide__body--fraunces' : 'slide__body--archivo'
  const sizeClass = slide.size ? `slide__body--${slide.size}` : ''
  const bodyClass = `${fontClass} ${sizeClass} slide__body--quote`.trim()

  const author = slide.author ? smartQuotes(slide.author) : null
  const source = slide.source ? smartQuotes(slide.source) : null
  const hasAttr = author || source

  return (
    <>
      <SlideHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>
        <div className="slide__quote-text">
          <span className="slide__qmark slide__qmark--open" aria-hidden="true">{'“'}</span>
          {parseLines(slide.lines, `q-${slide.num}`)}
          <span className="slide__qmark slide__qmark--close" aria-hidden="true">{'”'}</span>
        </div>
        {hasAttr && (
          <div className="slide__quote-attr">
            {author && <span className="slide__quote-attr-author">{`— ${author}`}</span>}
            {author && source && <br />}
            {source && <span className="slide__quote-attr-source">{source}</span>}
          </div>
        )}
      </div>
      <SlideFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
