import './slide-renderer.css'
import { getTemplate, DEFAULT_TEMPLATE_ID } from './templates/registry.js'
import { getFormat } from '../lib/formats/registry.js'
import { BackgroundImageLayer } from './BackgroundImageLayer.jsx'
import { BlankSlide } from './BlankSlide.jsx'
import { resolveFontVars, effectiveFonts } from '../lib/fonts/resolveFont.js'

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
export function SlideRenderer({ slide, theme, total, mode = 'preview', fontPreview = null }) {
  const effectiveTheme = fontPreview
    ? { ...theme, fonts: effectiveFonts(theme, fontPreview) }
    : theme

  const templateId = effectiveTheme?.template_id ?? DEFAULT_TEMPLATE_ID
  const template = getTemplate(templateId)
  const TemplateComponent = template.Component
  const format = getFormat(effectiveTheme?.format)
  const bgImage = slide.background_image

  const isBlank = slide.type === 'blank'

  return (
    <div
      className="slide"
      style={buildCssVars(effectiveTheme.palette, format, effectiveTheme)}
      data-slide-num={slide.num}
      data-slide-type={slide.type}
      data-template={isBlank ? 'blank' : template.id}
      data-format={format.id}
      data-mode={mode}
    >
      {bgImage && <BackgroundImageLayer bgImage={bgImage} theme={effectiveTheme} />}
      <div className="slide__content">
        {isBlank
          ? <BlankSlide slide={slide} />
          : <TemplateComponent slide={slide} theme={effectiveTheme} total={total} mode={mode} />
        }
      </div>
    </div>
  )
}

function buildCssVars(palette, format, theme) {
  const primary   = resolveFontVars('primary',   theme)
  const secondary = resolveFontVars('secondary', theme)
  const mono      = resolveFontVars('mono',      theme)

  return {
    '--slide-width':   `${format.width}px`,
    '--slide-height':  `${format.height}px`,
    '--slide-bg':      palette.background,
    '--slide-surface': palette.surface,
    '--slide-fg':      palette.foreground,
    '--slide-accent':  palette.accent,
    '--slide-muted':   palette.muted,
    '--slide-line':    palette.line,

    // Font vars per slot — usate dagli elementi decorativi (qmark, divider-num, mono-attr)
    '--slot-primary-family':          primary['--font-family'],
    '--slot-primary-weight':          primary['--font-weight'],
    '--slot-primary-letter-spacing':  primary['--font-letter-spacing'],
    '--slot-primary-text-transform':  primary['--font-text-transform'],
    '--slot-primary-variation':       primary['--font-variation-settings'],

    '--slot-secondary-family':        secondary['--font-family'],
    '--slot-secondary-weight':        secondary['--font-weight'],
    '--slot-secondary-letter-spacing': secondary['--font-letter-spacing'],
    '--slot-secondary-text-transform': secondary['--font-text-transform'],
    '--slot-secondary-variation':     secondary['--font-variation-settings'],

    '--slot-mono-family':             mono['--font-family'],
    '--slot-mono-weight':             mono['--font-weight'],
  }
}
