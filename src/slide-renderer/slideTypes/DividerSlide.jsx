import { SlideHeader } from './_SlideHeader.jsx'
import { SlideFooter } from './_SlideFooter.jsx'
import { parseLines } from '../inlineTags.jsx'

export function DividerSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'slide__body--fraunces' : 'slide__body--archivo'
  const sizeClass = slide.size ? `slide__body--${slide.size}` : 'slide__body--lg'
  const bodyClass = `${fontClass} ${sizeClass}`.trim()

  return (
    <>
      {/* Numero grande decorativo in background */}
      {slide.divider_number && (
        <div className="slide__divider-num">{slide.divider_number}</div>
      )}
      <SlideHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `div-${slide.num}`)}</div>
      {slide.divider_label && (
        <div className="slide__kicker" style={{ marginTop: '24px', marginBottom: 0 }}>
          {slide.divider_label}
        </div>
      )}
      <SlideFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
