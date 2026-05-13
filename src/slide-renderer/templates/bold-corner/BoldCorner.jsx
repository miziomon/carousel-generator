import { BoldCoverSlide }    from './BoldCoverSlide.jsx'
import { BoldStandardSlide } from './BoldStandardSlide.jsx'
import { BoldDividerSlide }  from './BoldDividerSlide.jsx'
import { BoldCtaSlide }      from './BoldCtaSlide.jsx'
import { BoldQuoteSlide }    from './BoldQuoteSlide.jsx'

export function BoldCorner({ slide, theme, total, mode }) {
  let SlideContent

  switch (slide.type) {
    case 'cover':    SlideContent = BoldCoverSlide;    break
    case 'standard': SlideContent = BoldStandardSlide; break
    case 'divider':  SlideContent = BoldDividerSlide;  break
    case 'cta':      SlideContent = BoldCtaSlide;      break
    case 'quote':    SlideContent = BoldQuoteSlide;    break
    default:
      return (
        <div className="bold">
          <div style={{ margin: 'auto', color: 'red', fontFamily: 'monospace', fontSize: 24 }}>
            Tipo slide sconosciuto: {slide.type}
          </div>
        </div>
      )
  }

  return (
    <div className="bold">
      <SlideContent slide={slide} theme={theme} total={total} mode={mode} />
    </div>
  )
}
