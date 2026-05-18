import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'
import { resolveSlideFont } from '../../../lib/fonts/resolveFont.js'

export function BoldCoverSlide({ slide, theme, total, calib }) {
  const fontVars = resolveSlideFont(slide, theme)
  const entry    = calib.body_archivo.cover
  const mdSize   = calib.body_archivo.md.size
  const base     = parseFloat(fontVars['--font-size-base'])
  const ratio    = entry.size / mdSize

  const finalSize = Math.round(base * ratio * parseFloat(fontVars['--font-size-multiplier']))
  const finalLH   = +(entry.line_height * parseFloat(fontVars['--font-line-height-multiplier'])).toFixed(3)

  const bodyStyle = {
    '--bold-body-size':        `${finalSize}px`,
    '--bold-body-line-height': finalLH,
    ...fontVars,
  }

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className="bold__body bold__body--cover" style={bodyStyle}>
        {parseLines(slide.lines, `bc-cover-${slide.num}`, BOLD_CLASS_MAP)}
      </div>
      {slide.show_swipe_arrow && (
        <div className="bold__swipe-mini">→ SWIPE</div>
      )}
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
