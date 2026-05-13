import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'

export function EditorialStandardSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'editorial__body--fraunces' : 'editorial__body--archivo'
  const sizeClass = slide.size ? `editorial__body--${slide.size}` : ''
  const bodyClass = `${fontClass} ${sizeClass}`.trim()

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `std-${slide.num}`, EDITORIAL_CLASS_MAP)}</div>
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
