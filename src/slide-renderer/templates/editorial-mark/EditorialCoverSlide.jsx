import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'

export function EditorialCoverSlide({ slide, theme, total }) {
  const bodyClass = 'editorial__body--archivo editorial__body--cover'

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `cover-${slide.num}`, EDITORIAL_CLASS_MAP)}</div>
      {slide.show_swipe_arrow && (
        <div className="editorial__swipe-mini">SCORRI →</div>
      )}
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
