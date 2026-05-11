import { SlideHeader } from './_SlideHeader.jsx'
import { SlideFooter } from './_SlideFooter.jsx'

export function CtaSlide({ slide, theme, total }) {
  return (
    <>
      <SlideHeader theme={theme} slide={slide} total={total} />
      <div className="slide__cta-row">
        {(slide.cta_items ?? []).map((item, i) => (
          <div key={i} className="slide__cta-item">
            {item}
          </div>
        ))}
      </div>
      <SlideFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
