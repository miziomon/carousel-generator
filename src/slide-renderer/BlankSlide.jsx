import { resolveSlideFont } from '../lib/fonts/resolveFont.js'
import { buildBodyStyle } from './templates/_shared/bodyStyle.js'
import './blank-slide.css'

/**
 * Slide blank: canvas pulito senza header/footer/decorazioni del template.
 * Mostra solo il background_image (gestito da BackgroundImageLayer) e,
 * se presente, una didascalia opzionale centrata o posizionata.
 *
 * Tutti gli override per-slide del TypographyPanel (font, size, interlinea,
 * colore, ombra) vengono applicati alla didascalia tramite buildBodyStyle.
 */
export function BlankSlide({ slide, theme }) {
  if (!slide.caption) return null

  const position = slide.caption_position ?? 'center'
  const slot = slide.font === 'secondary' ? 'secondary' : slide.font === 'mono' ? 'mono' : 'primary'

  const fontVars  = resolveSlideFont(slide, theme)
  const sizeBase  = slide.font_size_override ?? theme?.fonts?.sizes?.[slot] ?? 72
  const finalLH   = slide.line_height_override ?? theme?.lineHeight ?? 1.15

  const captionStyle = buildBodyStyle('blank', { finalSize: sizeBase, finalLH, fontVars, slide })

  const alignMap = {
    top:    { justifyContent: 'flex-start', paddingTop: '10%' },
    center: { justifyContent: 'center' },
    bottom: { justifyContent: 'flex-end', paddingBottom: '10%' },
  }

  return (
    <div className="blank-slide" style={alignMap[position]}>
      <p className="blank-slide__caption" style={captionStyle}>
        {slide.caption}
      </p>
    </div>
  )
}
