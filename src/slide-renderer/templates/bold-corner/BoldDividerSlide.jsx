import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'

export function BoldDividerSlide({ slide, theme, total, calib }) {
  const isFraunces = slide.font === 'fraunces'
  const fontClass  = isFraunces ? 'bold__body--fraunces' : 'bold__body--archivo'
  const sizeKey    = slide.size || 'lg'
  const sizeClass  = `bold__body--${sizeKey}`
  const bodyClass  = `${fontClass} ${sizeClass}`.trim()

  const bodyCalib = isFraunces
    ? (calib.body_fraunces[sizeKey] ?? calib.body_fraunces.lg)
    : (calib.body_archivo[sizeKey]  ?? calib.body_archivo.lg)

  const bodyStyle = {
    '--bold-body-size':        `${bodyCalib.size}px`,
    '--bold-body-line-height': bodyCalib.line_height,
  }

  return (
    <>
      {/* Numerone decorativo in background — semitraspare sotto il contenuto */}
      {slide.divider_number && (
        <div className="bold__divider-num">{slide.divider_number}</div>
      )}
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass} style={bodyStyle}>
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
