import { useState } from 'react'
import { Image } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { BackgroundImageSection } from '../../edit-modal/BackgroundImageSection.jsx'
import { ImageLibraryModal } from '../../image-library/ImageLibraryModal.jsx'
import { getFormat } from '../../../lib/formats/registry.js'
import './image-section.css'

const DEFAULT_BG_IMAGE = {
  data: '', opacity: 1, blur: 0, position: 'center',
  overlay: { enabled: false, type: 'palette', intensity: 0.5 },
}

/**
 * Sezione sidebar per l'immagine di sfondo globale del carousel.
 * L'immagine si applica a tutte le slide che non la sovrascrivono.
 * Le singole slide possono: ereditarla, personalizzarla, o forzare "nessuno sfondo".
 */
export function ImageSection({ isOpen, onToggle, theme, carousel, applyThemeBgImage, userId }) {
  const format = getFormat(theme?.format)
  const [libraryOpen, setLibraryOpen] = useState(false)

  function handleChange(bgImage) {
    applyThemeBgImage(bgImage)
  }

  function handleLibrarySelect(upload) {
    applyThemeBgImage({ ...DEFAULT_BG_IMAGE, data: upload.public_url })
  }

  return (
    <ThemeSection id="image" title="Immagine globale" icon={Image} isOpen={isOpen} onToggle={onToggle}>
      <div className="image-section">
        <p className="image-section__hint">
          Applicata a tutte le slide. Ogni slide può sovrascriverla o disattivarla.
        </p>
        {userId && (
          <button
            type="button"
            className="image-section__library-btn"
            onClick={() => setLibraryOpen(true)}
          >
            Sfoglia libreria
          </button>
        )}
        <BackgroundImageSection
          bgImage={theme?.background_image}
          theme={theme}
          format={format}
          carousel={carousel}
          onChange={handleChange}
          isGlobal
        />
      </div>
      {userId && (
        <ImageLibraryModal
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          userId={userId}
          onSelect={handleLibrarySelect}
        />
      )}
    </ThemeSection>
  )
}
