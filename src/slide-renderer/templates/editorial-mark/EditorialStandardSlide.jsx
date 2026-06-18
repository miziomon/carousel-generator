import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'
import { computeBodyFont } from '../_shared/bodyFont.js'
import { buildBodyStyle } from '../_shared/bodyStyle.js'

export function EditorialStandardSlide({ slide, theme, total, calib }) {
  const sizeKey = slide.size || 'xl'
  const { finalSize, finalLH, fontVars } = computeBodyFont(slide, theme, calib, sizeKey)
  const bodyStyle = buildBodyStyle('editorial', { finalSize, finalLH, fontVars, slide })

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={`editorial__body editorial__body--${sizeKey}`} style={bodyStyle}>
        {parseLines(slide.lines, `std-${slide.num}`, EDITORIAL_CLASS_MAP, slide.lines_align)}
      </div>
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
