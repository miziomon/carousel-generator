import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'

export function EditorialCtaSlide({ slide, theme, total }) {
  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className="editorial__cta-row">
        {(slide.cta_items ?? []).map((item, i) => (
          <div key={i} className="editorial__cta-item">
            {item}
          </div>
        ))}
      </div>
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
