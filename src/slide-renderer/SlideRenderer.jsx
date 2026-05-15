import './slide-renderer.css'
import { getTemplate, DEFAULT_TEMPLATE_ID } from './templates/registry.js'
import { getFormat } from '../lib/formats/registry.js'
import { BackgroundImageLayer } from './BackgroundImageLayer.jsx'
import { BlankSlide } from './BlankSlide.jsx'

/**
 * Renderizza una singola slide a dimensioni native (1080×H px).
 * Il caller applica transform: scale(N) su un wrapper per ridimensionare.
 *
 * Struttura DOM quando background_image è presente:
 *   .slide
 *     .slide__bg-image     (z-index 0)
 *     .slide__bg-overlay   (z-index 1, se overlay.enabled)
 *     .slide__content      (z-index 2)
 *
 * Props:
 *  slide  — oggetto slide dal JSON
 *  theme  — oggetto theme dal JSON (include template_id e palette)
 *  total  — numero totale di slide (per footer "02 / 15")
 *  mode   — "preview" | "export" (in export: niente animazioni)
 */
export function SlideRenderer({ slide, theme, total, mode = 'preview' }) {
  const templateId = theme?.template_id ?? DEFAULT_TEMPLATE_ID
  const template = getTemplate(templateId)
  const TemplateComponent = template.Component
  const format = getFormat(theme?.format)
  const bgImage = slide.background_image

  const isBlank = slide.type === 'blank'

  return (
    <div
      className="slide"
      style={buildCssVars(theme.palette, format)}
      data-slide-num={slide.num}
      data-slide-type={slide.type}
      data-template={isBlank ? 'blank' : template.id}
      data-format={format.id}
      data-mode={mode}
    >
      {bgImage && <BackgroundImageLayer bgImage={bgImage} theme={theme} />}
      <div className="slide__content">
        {isBlank
          ? <BlankSlide slide={slide} />
          : <TemplateComponent slide={slide} theme={theme} total={total} mode={mode} />
        }
      </div>
    </div>
  )
}

function buildCssVars(palette, format) {
  return {
    '--slide-width':   `${format.width}px`,
    '--slide-height':  `${format.height}px`,
    '--slide-bg':      palette.background,
    '--slide-surface': palette.surface,
    '--slide-fg':      palette.foreground,
    '--slide-accent':  palette.accent,
    '--slide-muted':   palette.muted,
    '--slide-line':    palette.line,
  }
}
