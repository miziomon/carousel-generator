import { hexToRgb } from '../lib/color/normalize.js'

/**
 * Layer immagine + overlay: si interpone tra il background della slide
 * e il contenuto del template. Renderizzato solo se bgImage è presente.
 */
export function BackgroundImageLayer({ bgImage, theme }) {
  const hasBlur = bgImage.blur > 0

  const imageStyle = {
    backgroundImage:    `url("${bgImage.data}")`,
    backgroundPosition: positionToCss(bgImage.position),
    backgroundSize:     bgImage.size ?? 'cover',
    opacity:            bgImage.opacity,
    filter:             hasBlur ? `blur(${bgImage.blur}px)` : 'none',
  }

  const imageClass = hasBlur
    ? 'slide__bg-image slide__bg-image--blurred'
    : 'slide__bg-image'

  const overlay = bgImage.overlay
  const overlayBg = overlay?.enabled ? computeOverlayBg(overlay, theme) : null

  return (
    <>
      <div className={imageClass} style={imageStyle} />
      {overlayBg && <div className="slide__bg-overlay" style={{ background: overlayBg }} />}
    </>
  )
}

function positionToCss(position) {
  // '9-grid' → CSS background-position (es. 'top-left' → 'left top')
  const map = {
    'top-left':     'left top',
    'top':          'center top',
    'top-right':    'right top',
    'left':         'left center',
    'center':       'center center',
    'right':        'right center',
    'bottom-left':  'left bottom',
    'bottom':       'center bottom',
    'bottom-right': 'right bottom',
  }
  return map[position] ?? 'center center'
}

function computeOverlayBg(overlay, theme) {
  const { type, intensity } = overlay
  switch (type) {
    case 'dark':
      return `rgba(0,0,0,${intensity})`
    case 'light':
      return `rgba(255,255,255,${intensity})`
    case 'palette': {
      const bg = theme?.palette?.background ?? '#000000'
      // Accetta sia hex che rgba() dal JSON
      if (bg.startsWith('#')) {
        const { r, g, b } = hexToRgb(bg)
        return `rgba(${r},${g},${b},${intensity})`
      }
      // fallback per valori non-hex (es. rgba già formattati)
      return `rgba(0,0,0,${intensity})`
    }
    default:
      return null
  }
}
