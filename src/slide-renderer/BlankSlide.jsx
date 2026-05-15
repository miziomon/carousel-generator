import './blank-slide.css'

/**
 * Slide blank: canvas pulito senza header/footer/decorazioni del template.
 * Mostra solo il background_image (gestito da BackgroundImageLayer) e,
 * se presente, una didascalia opzionale centrata o posizionata.
 */
export function BlankSlide({ slide }) {
  if (!slide.caption) return null

  const position = slide.caption_position ?? 'center'
  const fontFamily = slide.font === 'fraunces' ? 'Fraunces' : 'Archivo Black'

  const alignMap = {
    top:    { justifyContent: 'flex-start', paddingTop: '10%' },
    center: { justifyContent: 'center' },
    bottom: { justifyContent: 'flex-end', paddingBottom: '10%' },
  }

  return (
    <div className="blank-slide" style={alignMap[position]}>
      <p className="blank-slide__caption" style={{ fontFamily }}>
        {slide.caption}
      </p>
    </div>
  )
}
