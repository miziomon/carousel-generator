import './slide-renderer.css'
import { getTemplate, DEFAULT_TEMPLATE_ID } from './templates/registry.js'
import { getFormat } from '../lib/formats/registry.js'

/**
 * Renderizza una singola slide a dimensioni native 1080×1080.
 * Il caller applica transform: scale(N) su un wrapper per ridimensionare.
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

  return (
    <div
      className="slide"
      style={buildCssVars(theme.palette, format)}
      data-slide-num={slide.num}
      data-slide-type={slide.type}
      data-template={template.id}
      data-format={format.id}
      data-mode={mode}
    >
      <TemplateComponent slide={slide} theme={theme} total={total} mode={mode} />
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
