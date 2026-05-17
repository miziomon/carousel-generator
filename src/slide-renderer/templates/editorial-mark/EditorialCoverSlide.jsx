import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'
import { resolveFontVars } from '../../../lib/fonts/resolveFont.js'

export function EditorialCoverSlide({ slide, theme, total, calib }) {
  const fontVars = resolveFontVars(slide.font, theme)
  const base     = calib.body_archivo.cover

  const finalSize = Math.round(base.size * parseFloat(fontVars['--font-size-multiplier']))
  const finalLH   = +(base.line_height * parseFloat(fontVars['--font-line-height-multiplier'])).toFixed(3)

  const bodyStyle = {
    '--editorial-body-size':        `${finalSize}px`,
    '--editorial-body-line-height': finalLH,
    ...fontVars,
  }

  return (
    <>
      <EditorialHeader theme={theme} slide={slide} total={total} />
      <div className="editorial__body editorial__body--cover" style={bodyStyle}>
        {parseLines(slide.lines, `cover-${slide.num}`, EDITORIAL_CLASS_MAP)}
      </div>
      {slide.show_swipe_arrow && (
        <div className="editorial__swipe-mini">SCORRI →</div>
      )}
      <EditorialFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
