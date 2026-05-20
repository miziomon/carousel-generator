import { EditorialHeader } from './EditorialHeader.jsx'
import { EditorialFooter } from './EditorialFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { EDITORIAL_CLASS_MAP } from './constants.js'
import { resolveSlideFont } from '../../../lib/fonts/resolveFont.js'

export function EditorialCoverSlide({ slide, theme, total, calib }) {
  const fontVars = resolveSlideFont(slide, theme)
  const entry    = calib.body_archivo.cover
  const mdSize   = calib.body_archivo.md.size
  const base     = parseFloat(fontVars['--font-size-base'])
  const ratio    = entry.size / mdSize

  const finalSize = Math.round(base * ratio * parseFloat(fontVars['--font-size-multiplier']))
  const lhMult    = slide.line_height_override ?? theme.lineHeight ?? 1
  const finalLH   = +(entry.line_height * parseFloat(fontVars['--font-line-height-multiplier']) * lhMult).toFixed(3)

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
