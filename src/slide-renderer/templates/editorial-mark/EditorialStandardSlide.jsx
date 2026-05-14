import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'

export function EditorialStandardSlide({ slide, theme, total, calib }) {
  const isFraunces = slide.font === 'fraunces'
  const fontClass  = isFraunces ? 'editorial__body--fraunces' : 'editorial__body--archivo'
  const sizeKey    = slide.size || 'xl'
  const sizeClass  = `editorial__body--${sizeKey}`
  const bodyClass  = `${fontClass} ${sizeClass}`.trim()

  const bodyCalib = isFraunces
    ? (calib.body_fraunces[sizeKey] ?? calib.body_fraunces.xl)
    : (calib.body_archivo[sizeKey]  ?? calib.body_archivo.xl)

  const bodyStyle = {
    '--editorial-body-size':        `${bodyCalib.size}px`,
    '--editorial-body-line-height': bodyCalib.line_height,
  }

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass} style={bodyStyle}>
        {parseLines(slide.lines, `std-${slide.num}`, EDITORIAL_CLASS_MAP)}
      </div>
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
