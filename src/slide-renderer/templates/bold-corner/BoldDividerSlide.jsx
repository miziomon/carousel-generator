import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'
import { computeBodyFont } from '../_shared/bodyFont.js'
import { buildBodyStyle } from '../_shared/bodyStyle.js'

export function BoldDividerSlide({ slide, theme, total, calib }) {
  const sizeKey = slide.size || 'lg'
  const { finalSize, finalLH, fontVars } = computeBodyFont(slide, theme, calib, sizeKey)
  const bodyStyle = buildBodyStyle('bold', { finalSize, finalLH, fontVars, slide })

  return (
    <>
      {/* Numerone decorativo in background — semitraspare sotto il contenuto */}
      {slide.divider_number && (
        <div className="bold__divider-num">{slide.divider_number}</div>
      )}
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={`bold__body bold__body--${sizeKey}`} style={bodyStyle}>
        {parseLines(slide.lines, `bc-div-${slide.num}`, BOLD_CLASS_MAP)}
      </div>
      {slide.divider_label && (
        <div className="bold__kicker" style={{ marginTop: '24px', marginBottom: 0 }}>
          {slide.divider_label}
        </div>
      )}
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
