import { EditorialCoverSlide }    from './EditorialCoverSlide.jsx'
import { EditorialStandardSlide } from './EditorialStandardSlide.jsx'
import { EditorialDividerSlide }  from './EditorialDividerSlide.jsx'
import { EditorialCtaSlide }      from './EditorialCtaSlide.jsx'
import { EditorialQuoteSlide }    from './EditorialQuoteSlide.jsx'

// Router del template: smista per slide.type e avvolge tutto nel container .editorial
export function EditorialMark({ slide, theme, total, mode }) {
  let SlideContent

  switch (slide.type) {
    case 'cover':    SlideContent = EditorialCoverSlide;    break
    case 'standard': SlideContent = EditorialStandardSlide; break
    case 'divider':  SlideContent = EditorialDividerSlide;  break
    case 'cta':      SlideContent = EditorialCtaSlide;      break
    case 'quote':    SlideContent = EditorialQuoteSlide;    break
    default:
      return (
        <div className="editorial">
          <div style={{ margin: 'auto', color: 'red', fontFamily: 'monospace', fontSize: 24 }}>
            Tipo slide sconosciuto: {slide.type}
          </div>
        </div>
      )
  }

  return (
    <div className="editorial">
      <SlideContent slide={slide} theme={theme} total={total} mode={mode} />
    </div>
  )
}
