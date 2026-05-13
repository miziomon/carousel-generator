import { BoldHeader } from './BoldHeader.jsx'
import { BoldFooter } from './BoldFooter.jsx'
import { parseLines } from '../../inlineTags.jsx'
import { BOLD_CLASS_MAP } from './constants.js'

export function BoldDividerSlide({ slide, theme, total }) {
  const fontClass = slide.font === 'fraunces' ? 'bold__body--fraunces' : 'bold__body--archivo'
  const sizeClass = slide.size ? `bold__body--${slide.size}` : 'bold__body--lg'
  const bodyClass = `${fontClass} ${sizeClass}`.trim()

  return (
    <>
      {/* Numerone decorativo in background — semitraspare sotto il contenuto */}
      {slide.divider_number && (
        <div className="bold__divider-num">{slide.divider_number}</div>
      )}
      <BoldHeader theme={theme} slide={slide} total={total} />
      <div className={bodyClass}>{parseLines(slide.lines, `bc-div-${slide.num}`, BOLD_CLASS_MAP)}</div>
      {slide.divider_label && (
        <div className="bold__kicker" style={{ marginTop: '24px', marginBottom: 0 }}>
          {slide.divider_label}
        </div>
      )}
      <BoldFooter theme={theme} slide={slide} total={total} />
    </>
  )
}
