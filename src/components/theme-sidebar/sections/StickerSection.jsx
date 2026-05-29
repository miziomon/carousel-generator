import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { ImageLibraryModal } from '../../image-library/ImageLibraryModal.jsx'
import { StickerEditor } from './StickerEditor.jsx'
import './sticker-section.css'

const DEFAULT_STICKER = {
  size:     150,
  rotation: 0,
  opacity:  1,
  position: { x: 50, y: 50 },
}

/**
 * Sezione sidebar per lo sticker globale del carousel.
 * Lo sticker è un'immagine sovrapposta al contenuto di tutte le slide.
 *
 * @param {boolean}  isOpen            - Sezione aperta.
 * @param {function} onToggle          - Callback apertura/chiusura.
 * @param {object}   theme             - Tema corrente del carousel.
 * @param {function} applyThemeSticker - Azione store per applicare/rimuovere lo sticker.
 * @param {string}   [userId]          - ID utente (abilita Sfoglia libreria).
 */
export function StickerSection({ isOpen, onToggle, theme, applyThemeSticker, userId }) {
  const [libraryOpen, setLibraryOpen] = useState(false)
  const sticker = theme?.global_sticker ?? null

  function handleChange(updated) {
    applyThemeSticker(updated)
  }

  function handleRemove() {
    applyThemeSticker(undefined)
  }

  function handleLibrarySelect(upload) {
    applyThemeSticker({ ...DEFAULT_STICKER, data: upload.public_url })
  }

  return (
    <ThemeSection id="sticker" title="Sticker globale" icon={Sparkles} isOpen={isOpen} onToggle={onToggle}>
      <div className="sticker-section">
        <p className="sticker-section__hint">
          Applicato a tutte le slide. Ogni slide può sovrascriverlo o disattivarlo.
        </p>
        {userId && (
          <button
            type="button"
            className="sticker-section__library-btn"
            onClick={() => setLibraryOpen(true)}
          >
            Sfoglia libreria
          </button>
        )}
        <StickerEditor
          sticker={sticker}
          onChange={handleChange}
          onRemove={handleRemove}
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
