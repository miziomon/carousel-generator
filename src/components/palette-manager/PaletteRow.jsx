import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import { PaletteThumbnail } from '../theme-tab/PaletteThumbnail.jsx'

/**
 * Singola riga nel gestore palette con azioni contestuali.
 *
 * Regole di visibilita':
 *   - "Applica" e "Duplica": sempre visibili (system e user)
 *   - "Modifica": solo palette user (assente, non disabled, per system)
 *   - "Elimina":  solo palette user (assente, non disabled, per system)
 *   - "Esporta":  sempre visibile
 *
 * @param {object}   palette       — oggetto palette completo
 * @param {Function} onApply       — callback(paletteId)
 * @param {Function} onDuplicate   — callback(paletteId) — apre il form con nome suggerito
 * @param {Function} onEdit        — callback(paletteId) — solo per palette user
 * @param {Function} onExport      — callback(paletteId)
 * @param {Function} onDelete      — callback(paletteId) — solo per palette user
 */
export function PaletteRow({ palette, onApply, onDuplicate, onEdit, onExport, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Chiude il menu al click esterno o alla pressione di Esc
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  const isSystem = palette.origin === 'system'

  return (
    <div className="palette-row">
      {/* Thumbnail dei 6 slot colore */}
      <PaletteThumbnail colors={palette.colors} size={22} />

      {/* Info nome + badge + descrizione */}
      <div className="palette-row__info">
        <div className="palette-row__name-line">
          <span className="palette-row__name">{palette.name}</span>
          <span className={'palette-row__badge palette-row__badge--' + (isSystem ? 'system' : 'user')}>
            {isSystem ? 'System' : 'Custom'}
          </span>
        </div>
        {palette.description && (
          <span className="palette-row__description">{palette.description}</span>
        )}
      </div>

      {/* Azioni */}
      <div className="palette-row__actions">
        {/* Applica — CTA primaria sempre visibile */}
        <button type="button" className="palette-row__apply-btn" onClick={() => onApply(palette.id)}>
          Applica
        </button>

        {/* Menu contestuale */}
        <div className="palette-row__menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="palette-row__menu-trigger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Altre azioni"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="palette-row__menu" role="menu">
              {/* Duplica — disponibile per tutti i tipi */}
              <button
                type="button"
                className="palette-row__menu-item"
                role="menuitem"
                onClick={() => { onDuplicate(palette.id); setMenuOpen(false) }}
              >
                Duplica
              </button>

              {/* Modifica — solo palette user, assente per system */}
              {!isSystem && (
                <button
                  type="button"
                  className="palette-row__menu-item"
                  role="menuitem"
                  onClick={() => { onEdit(palette.id); setMenuOpen(false) }}
                >
                  Modifica
                </button>
              )}

              {/* Esporta — disponibile per tutti i tipi */}
              <button
                type="button"
                className="palette-row__menu-item"
                role="menuitem"
                onClick={() => { onExport(palette.id); setMenuOpen(false) }}
              >
                Esporta
              </button>

              {/* Elimina — solo palette user, assente per system */}
              {!isSystem && (
                <button
                  type="button"
                  className="palette-row__menu-item palette-row__menu-item--danger"
                  role="menuitem"
                  onClick={() => { onDelete(palette.id); setMenuOpen(false) }}
                >
                  Elimina
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
