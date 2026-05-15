import { BackgroundImageLayer } from '../../slide-renderer/BackgroundImageLayer.jsx'

/**
 * Mini-anteprima live dell'immagine con tutti gli effetti applicati.
 * Mantiene l'aspect ratio del formato del carosello.
 *
 * Props:
 *   bgImage  — oggetto background_image
 *   theme    — theme del carosello (per palette overlay)
 *   format   — oggetto formato { width, height } da getFormat()
 *   width    — larghezza in px del contenitore (default 280)
 */
export function BackgroundImagePreview({ bgImage, theme, format, width = 280 }) {
  const height = Math.round(width * (format.height / format.width))

  return (
    <div
      className="bg-image-preview"
      style={{
        width,
        height,
        background: theme.palette.background,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 6,
        flexShrink: 0,
      }}
    >
      <BackgroundImageLayer bgImage={bgImage} theme={theme} />
    </div>
  )
}
