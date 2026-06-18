import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'
import { computeBodyFont } from '../_shared/bodyFont.js'
import { buildBodyStyle } from '../_shared/bodyStyle.js'

export function EditorialDividerSlide({ slide, theme, total, calib }) {
  const sizeKey = slide.size || 'lg'
  const { finalSize, finalLH, fontVars } = computeBodyFont(slide, theme, calib, sizeKey)
  const bodyStyle = buildBodyStyle('editorial', { finalSize, finalLH, fontVars, slide })

  return (
    <>
      {slide.divider_number && (
        <div className="editorial__divider-num">{slide.divider_number}</div>
      )}
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={`editorial__body editorial__body--${sizeKey}`} style={bodyStyle}>
        {parseLines(slide.lines, `div-${slide.num}`, EDITORIAL_CLASS_MAP, slide.lines_align)}
      </div>
      {slide.divider_label && (
        <div className="editorial__kicker" style={{ marginTop: '24px', marginBottom: 0 }}>
          {slide.divider_label}
        </div>
      )}
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
