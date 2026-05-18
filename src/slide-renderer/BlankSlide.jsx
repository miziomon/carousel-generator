import './blank-slide.css'

/**
 * Slide blank: canvas pulito senza header/footer/decorazioni del template.
 * Mostra solo il background_image (gestito da BackgroundImageLayer) e,
 * se presente, una didascalia opzionale centrata o posizionata.
 * La didascalia usa le CSS var del font slot (primary o secondary)
 * iniettate da SlideRenderer via --slot-*-family.
 */
export function BlankSlide({ slide }) {
  if (!slide.caption) return null

  const position = slide.caption_position ?? 'center'
  const slot = slide.font === 'secondary' ? 'secondary' : slide.font === 'mono' ? 'mono' : 'primary'

  const alignMap = {
    top:    { justifyContent: 'flex-start', paddingTop: '10%' },
    center: { justifyContent: 'center' },
    bottom: { justifyContent: 'flex-end', paddingBottom: '10%' },
  }

  return (
    <div className="blank-slide" style={alignMap[position]}>
      <p
        className="blank-slide__caption"
        style={{ fontFamily: `var(--slot-${slot}-family)` }}
      >
        {slide.caption}
      </p>
    </div>
  )
}
