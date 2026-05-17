import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'
import { resolveFontVars } from '../../../lib/fonts/resolveFont.js'

export function BoldDividerSlide({ slide, theme, total, calib }) {
  const fontVars = resolveFontVars(slide.font, theme)
  const sizeKey  = slide.size || 'lg'
  const base     = calib.body_archivo[sizeKey] ?? calib.body_archivo.lg

  const finalSize = Math.round(base.size * parseFloat(fontVars['--font-size-multiplier']))
  const finalLH   = +(base.line_height * parseFloat(fontVars['--font-line-height-multiplier'])).toFixed(3)

  const bodyStyle = {
    '--bold-body-size':        `${finalSize}px`,
    '--bold-body-line-height': finalLH,
    ...fontVars,
  }

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
