import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'

export function BoldStandardSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'bold__body--fraunces' : 'bold__body--archivo'
  const sizeClass = slide.size ? `bold__body--${slide.size}` : ''
  const bodyClass = `${fontClass} ${sizeClass}`.trim()

  return (
    <>
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `bc-std-${slide.num}`, BOLD_CLASS_MAP)}</div>
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
