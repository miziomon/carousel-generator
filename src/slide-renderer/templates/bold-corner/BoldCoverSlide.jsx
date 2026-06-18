import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'
import { computeBodyFont } from '../_shared/bodyFont.js'
import { buildBodyStyle } from '../_shared/bodyStyle.js'

export function BoldCoverSlide({ slide, theme, total, calib }) {
  const { finalSize, finalLH, fontVars } = computeBodyFont(slide, theme, calib, 'cover')
  const bodyStyle = buildBodyStyle('bold', { finalSize, finalLH, fontVars, slide })

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className="bold__body bold__body--cover" style={bodyStyle}>
        {parseLines(slide.lines, `bc-cover-${slide.num}`, BOLD_CLASS_MAP, slide.lines_align)}
      </div>
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
