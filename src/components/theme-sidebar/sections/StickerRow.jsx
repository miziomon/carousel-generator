import { ChevronRight, ChevronDown, ArrowUp, ArrowDown, X, Image } from 'lucide-react'
import { StickerEditor } from './StickerEditor.jsx'
import './sticker-row.css'

/**
 * Riga accordion per un singolo sticker nella lista sticker globali.
 * Mostra header compatto (thumbnail 32px, label, frecce riordino, rimozione)
 * e, se espanso, il corpo con StickerEditor.
 *
 * @param {object}   sticker        - Oggetto sticker corrente.
 * @param {number}   index          - Indice 0-based nella lista (per label "Sticker N").
 * @param {boolean}  isExpanded     - Accordion aperto.
 * @param {function} onToggleExpand - Callback con id sticker per aprire/chiudere.
 * @param {function} onUpdate       - Callback (id, patch) per aggiornare i campi.
 * @param {function} onRemove       - Callback (id) per rimuovere lo sticker.
 * @param {function} onMoveUp       - Callback (id) per spostare su.
 * @param {function} onMoveDown     - Callback (id) per spostare giù.
 * @param {boolean}  canMoveUp      - Freccia su abilitata.
 * @param {boolean}  canMoveDown    - Freccia giù abilitata.
 * @param {string}   [userId]       - ID utente (abilita sfoglia libreria).
 * @param {string}   [formatId]     - ID formato slide corrente (per position picker).
 */
export function StickerRow({
  sticker,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  userId,
  formatId,
}) {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

  function handleEditorChange(patch) {
    onUpdate(sticker.id, patch)
  }

  return (
    <div className={`sticker-row${isExpanded ? ' sticker-row--expanded' : ''}`}>
      {/* Header */}
      <div className="sticker-row__header">
        <button
          type="button"
          className="sticker-row__toggle"
          onClick={() => onToggleExpand(sticker.id)}
          aria-expanded={isExpanded}
          aria-label={`Sticker ${index + 1}`}
        >
          <ChevronIcon size={13} className="sticker-row__chevron" />
          <span className="sticker-row__thumb-wrap">
            {sticker.data
              ? <img src={sticker.data} alt="" className="sticker-row__thumb" />
              : <span className="sticker-row__thumb-placeholder" aria-hidden="true"><Image size={16} /></span>
            }
          </span>
          <span className="sticker-row__label">Sticker {index + 1}</span>
        </button>

        <div className="sticker-row__actions">
          <button
            type="button"
            className="sticker-row__action-btn"
            onClick={() => onMoveUp(sticker.id)}
            disabled={!canMoveUp}
            aria-label="Sposta su"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            className="sticker-row__action-btn"
            onClick={() => onMoveDown(sticker.id)}
            disabled={!canMoveDown}
            aria-label="Sposta giù"
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            className="sticker-row__action-btn sticker-row__action-btn--remove"
            onClick={() => onRemove(sticker.id)}
            aria-label="Rimuovi sticker"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Corpo accordion */}
      {isExpanded && (
        <div className="sticker-row__body">
          <StickerEditor
            sticker={sticker}
            onChange={handleEditorChange}
            userId={userId}
            formatId={formatId}
          />
        </div>
      )}
    </div>
  )
}
