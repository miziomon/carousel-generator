import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'

export function BoldStandardSlide({ slide, theme, total, calib }) {
  const isFraunces = slide.font === 'fraunces'
  const fontClass  = isFraunces ? 'bold__body--fraunces' : 'bold__body--archivo'
  const sizeKey    = slide.size || 'xl'
  const sizeClass  = `bold__body--${sizeKey}`
  const bodyClass  = `${fontClass} ${sizeClass}`.trim()

  const bodyCalib = isFraunces
    ? (calib.body_fraunces[sizeKey] ?? calib.body_fraunces.xl)
    : (calib.body_archivo[sizeKey]  ?? calib.body_archivo.xl)

  const bodyStyle = {
    '--bold-body-size':        `${bodyCalib.size}px`,
    '--bold-body-line-height': bodyCalib.line_height,
  }

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass} style={bodyStyle}>
        {parseLines(slide.lines, `bc-std-${slide.num}`, BOLD_CLASS_MAP)}
      </div>
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
