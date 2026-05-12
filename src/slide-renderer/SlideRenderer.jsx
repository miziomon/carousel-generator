import './slide-renderer.css'
import { CoverSlide } from './slideTypes/CoverSlide.jsx'
import { StandardSlide } from './slideTypes/StandardSlide.jsx'
import { DividerSlide } from './slideTypes/DividerSlide.jsx'
import { CtaSlide } from './slideTypes/CtaSlide.jsx'
import { QuoteSlide } from './slideTypes/QuoteSlide.jsx'

const SLIDE_COMPONENTS = {
  cover: CoverSlide,
  standard: StandardSlide,
  divider: DividerSlide,
  cta: CtaSlide,
  quote: QuoteSlide,
}

/**
 * Renderizza una singola slide a dimensioni native 1080×1080.
 * Il caller usa transform: scale(N) su un wrapper per ridimensionare.
 *
 * Props:
 *  slide  — oggetto slide dal JSON
 *  theme  — oggetto theme dal JSON
 *  total  — numero totale di slide (per footer "02 / 15")
 *  mode   — "preview" | "export" (in export: niente animazioni)
 */
export function SlideRenderer({ slide, theme, total, mode = 'preview' }) {
  const SlideComponent = SLIDE_COMPONENTS[slide.type]

  if (!SlideComponent) {
    return (
      <div className="slide" style={buildCssVars(theme.palette)}>
        <div style={{ margin: 'auto', color: 'red', fontFamily: 'monospace', fontSize: 24 }}>
          Tipo slide sconosciuto: {slide.type}
        </div>
      </div>
    )
  }

  return (
    <div
      className="slide"
      style={buildCssVars(theme.palette)}
      data-slide-num={slide.num}
      data-slide-type={slide.type}
      data-mode={mode}
    >
      <SlideComponent slide={slide} theme={theme} total={total} />
    </div>
  )
}

function buildCssVars(palette) {
  return {
    '--slide-bg': palette.background,
    '--slide-fg': palette.foreground,
    '--slide-accent': palette.accent,
    '--slide-muted': palette.muted,
    '--slide-line': palette.line,
  }
}
