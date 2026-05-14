import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'

export function EditorialDividerSlide({ slide, theme, total, calib }) {
  const isFraunces = slide.font === 'fraunces'
  const fontClass  = isFraunces ? 'editorial__body--fraunces' : 'editorial__body--archivo'
  const sizeKey    = slide.size || 'lg'
  const sizeClass  = `editorial__body--${sizeKey}`
  const bodyClass  = `${fontClass} ${sizeClass}`.trim()

  const bodyCalib = isFraunces
    ? (calib.body_fraunces[sizeKey] ?? calib.body_fraunces.lg)
    : (calib.body_archivo[sizeKey]  ?? calib.body_archivo.lg)

  const bodyStyle = {
    '--editorial-body-size':        `${bodyCalib.size}px`,
    '--editorial-body-line-height': bodyCalib.line_height,
  }

  return (
    <>
      {slide.divider_number && (
        <div className="editorial__divider-num">{slide.divider_number}</div>
      )}
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass} style={bodyStyle}>
        {parseLines(slide.lines, `div-${slide.num}`, EDITORIAL_CLASS_MAP)}
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
