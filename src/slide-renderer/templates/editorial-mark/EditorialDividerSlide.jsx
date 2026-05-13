import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'

export function EditorialDividerSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'editorial__body--fraunces' : 'editorial__body--archivo'
  const sizeClass = slide.size ? `editorial__body--${slide.size}` : 'editorial__body--lg'
  const bodyClass = `${fontClass} ${sizeClass}`.trim()

  return (
    <>
      {slide.divider_number && (
        <div className="editorial__divider-num">{slide.divider_number}</div>
      )}
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `div-${slide.num}`, EDITORIAL_CLASS_MAP)}</div>
      {slide.divider_label && (
        <div className="editorial__kicker" style={{ marginTop: '24px', marginBottom: 0 }}>
          {slide.divider_label}
        </div>
      )}
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
