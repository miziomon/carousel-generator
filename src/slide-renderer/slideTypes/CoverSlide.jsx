import { SlideHeader } from './_SlideHeader.jsx'
import { SlideFooter } from './_SlideFooter.jsx'
import { parseLines } from '../inlineTags.jsx'

export function CoverSlide({ slide, theme, total }) {
  const bodyClass = `slide__body--archivo slide__body--cover`

  return (
    <>
      <SlideHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `cover-${slide.num}`)}</div>
      {slide.show_swipe_arrow && (
        <div className="slide__swipe-mini">SCORRI →</div>
      )}
      <SlideFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
