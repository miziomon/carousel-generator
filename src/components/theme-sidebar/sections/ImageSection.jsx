import { Image } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { BackgroundImageSection } from '../../edit-modal/BackgroundImageSection.jsx'
import { getFormat } from '../../../lib/formats/registry.js'
import './image-section.css'

/**
 * Sezione sidebar per l'immagine di sfondo globale del carousel.
 * L'immagine si applica a tutte le slide che non la sovrascrivono.
 * Le singole slide possono: ereditarla, personalizzarla, o forzare "nessuno sfondo".
 */
export function ImageSection({ isOpen, onToggle, theme, carousel, applyThemeBgImage }) {
  const format = getFormat(theme?.format)

  function handleChange(bgImage) {
    applyThemeBgImage(bgImage)
  }

  return (
    <ThemeSection id="image" title="Immagine globale" icon={Image} isOpen={isOpen} onToggle={onToggle}>
      <div className="image-section">
        <p className="image-section__hint">
          Applicata a tutte le slide. Ogni slide può sovrascriverla o disattivarla.
        </p>
        <BackgroundImageSection
          bgImage={theme?.background_image}
          theme={theme}
          format={format}
          carousel={carousel}
          onChange={handleChange}
          isGlobal
        />
      </div>
    </ThemeSection>
  )
}
