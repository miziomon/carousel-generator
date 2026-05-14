import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'

export function BoldCoverSlide({ slide, theme, total, calib }) {
  const bodyCalib = calib.body_archivo.cover
  const bodyClass = 'bold__body--archivo bold__body--cover'
  const bodyStyle = {
    '--bold-body-size':        `${bodyCalib.size}px`,
    '--bold-body-line-height': bodyCalib.line_height,
  }

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass} style={bodyStyle}>
        {parseLines(slide.lines, `bc-cover-${slide.num}`, BOLD_CLASS_MAP)}
      </div>
      {slide.show_swipe_arrow && (
        <div className="bold__swipe-mini">→ SWIPE</div>
      )}
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
