import { useState } from 'react'
import { Sparkles, Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import { ThemeSection } from '../ThemeSection.jsx'
import { StickerRow } from './StickerRow.jsx'
import './sticker-section.css'

const NEW_STICKER_DEFAULTS = {
  size:     150,
  rotation: 0,
  opacity:  1,
  position: { x: 50, y: 50 },
}

/**
 * Sezione sidebar per la gestione degli sticker globali del carousel.
 * Mostra una lista di accordion esclusivi (uno aperto alla volta).
 *
 * @param {boolean}  isOpen               - Sezione aperta.
 * @param {function} onToggle             - Callback apertura/chiusura sezione.
 * @param {object}   theme                - Tema corrente del carousel.
 * @param {function} addThemeSticker      - Aggiunge un nuovo sticker all'array.
 * @param {function} updateThemeSticker   - Aggiorna i campi di uno sticker (id, patch).
 * @param {function} removeThemeSticker   - Rimuove uno sticker per id.
 * @param {function} reorderThemeSticker  - Sposta uno sticker su/giù (id, direction).
 * @param {string}   [userId]             - ID utente (abilita sfoglia libreria).
 */
export function StickerSection({
  isOpen,
  onToggle,
  theme,
  addThemeSticker,
  updateThemeSticker,
  removeThemeSticker,
  reorderThemeSticker,
  userId,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const stickers = theme?.global_stickers ?? []

  function handleToggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function handleAdd() {
    const id = nanoid(8)
    addThemeSticker({ ...NEW_STICKER_DEFAULTS, id })
    setExpandedId(id)
  }

  function handleRemove(id) {
    removeThemeSticker(id)
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <ThemeSection id="sticker" title="Sticker globali" icon={Sparkles} isOpen={isOpen} onToggle={onToggle}>
      <div className="sticker-section">
        <p className="sticker-section__hint">
          Applicati a tutte le slide.
        </p>

        <div className="sticker-section__list">
          {stickers.map((sticker, index) => (
            <StickerRow
              key={sticker.id}
              sticker={sticker}
              index={index}
              isExpanded={expandedId === sticker.id}
              onToggleExpand={handleToggleExpand}
              onUpdate={updateThemeSticker}
              onRemove={handleRemove}
              onMoveUp={(id) => reorderThemeSticker(id, 'up')}
              onMoveDown={(id) => reorderThemeSticker(id, 'down')}
              canMoveUp={index > 0}
              canMoveDown={index < stickers.length - 1}
              userId={userId}
              formatId={theme?.format}
            />
          ))}
        </div>

        <button
          type="button"
          className="sticker-section__add-btn"
          onClick={handleAdd}
        >
          <Plus size={13} />
          Aggiungi sticker
        </button>
      </div>
    </ThemeSection>
  )
}
