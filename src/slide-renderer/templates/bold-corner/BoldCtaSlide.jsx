import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'

export function BoldCtaSlide({ slide, theme, total }) {
  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className="bold__cta-row">
        {(slide.cta_items ?? []).map((item, i) => (
          <div key={i} className="bold__cta-item">
            {item}
          </div>
        ))}
      </div>
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
