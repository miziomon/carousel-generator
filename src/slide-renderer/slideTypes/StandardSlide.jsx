import { SlideHeader } from './_SlideHeader.jsx'
import { SlideFooter } from './_SlideFooter.jsx'
import { parseLines } from '../inlineTags.jsx'

export function StandardSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'slide__body--fraunces' : 'slide__body--archivo'
  const sizeClass = slide.size ? `slide__body--${slide.size}` : ''
  const bodyClass = `${fontClass} ${sizeClass}`.trim()

  return (
    <>
      <SlideHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `std-${slide.num}`)}</div>
      <SlideFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
