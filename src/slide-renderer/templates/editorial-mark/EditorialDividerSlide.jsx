import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'
import { resolveFontVars } from '../../../lib/fonts/resolveFont.js'

export function EditorialDividerSlide({ slide, theme, total, calib }) {
  const fontVars = resolveFontVars(slide.font, theme)
  const sizeKey  = slide.size || 'lg'
  const base     = calib.body_archivo[sizeKey] ?? calib.body_archivo.lg

  const finalSize = Math.round(base.size * parseFloat(fontVars['--font-size-multiplier']))
  const finalLH   = +(base.line_height * parseFloat(fontVars['--font-line-height-multiplier'])).toFixed(3)

  const bodyStyle = {
    '--editorial-body-size':        `${finalSize}px`,
    '--editorial-body-line-height': finalLH,
    ...fontVars,
  }

  return (
    <>
      {slide.divider_number && (
        <div className="editorial__divider-num">{slide.divider_number}</div>
      )}
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className={`editorial__body editorial__body--${sizeKey}`} style={bodyStyle}>
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
