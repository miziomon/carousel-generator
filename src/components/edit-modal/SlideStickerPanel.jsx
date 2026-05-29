import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Plus, ArrowUp, ArrowDown, X, EyeOff, Eye, RotateCcw, ChevronRight, ChevronDown, Image } from 'lucide-react'
import { StickerEditor } from '../theme-sidebar/sections/StickerEditor.jsx'
import { resolveSlideStickers, materializeOrder } from '../../lib/resolveSlideStickers.js'
import './slide-sticker-panel.css'

const NEW_STICKER_DEFAULTS = { size: 150, rotation: 0, opacity: 1, position: { x: 50, y: 50 } }

/**
 * Pannello gestione sticker per la singola slide nel modale di edit.
 * Opera sul draft locale: le modifiche vengono committate solo al salvataggio.
 *
 * @param {object}   draft     - Draft corrente della slide.
 * @param {object}   theme     - Tema del carousel (per global_stickers).
 * @param {function} set       - Setter del draft (field, value).
 * @param {string}   [userId]  - ID utente (abilita sfoglia libreria immagini).
 */
export function SlideStickerPanel({ draft, theme, set, userId }) {
  const [expandedId, setExpandedId] = useState(null)
  const [hiddenSectionOpen, setHiddenSectionOpen] = useState(false)

  const globalStickers = theme?.global_stickers ?? []
  const globalIds      = new Set(globalStickers.map((s) => s.id))
  const resolved       = resolveSlideStickers(draft, theme)
  const hiddenIds      = draft.hidden_stickers ?? []
  const overrides      = draft.sticker_overrides ?? {}

  // Sticker globali effettivamente nascosti in questa slide
  const hiddenGlobals = globalStickers.filter((s) => hiddenIds.includes(s.id))

  function handleToggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // ── Riordino ─────────────────────────────────────────────────────────────────

  function handleMoveUp(id) {
    const order   = materializeOrder(draft, theme)
    const idx     = order.indexOf(id)
    if (idx <= 0) return
    const newOrder = [...order]
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    set('sticker_order', newOrder)
  }

  function handleMoveDown(id) {
    const order = materializeOrder(draft, theme)
    const idx   = order.indexOf(id)
    if (idx === -1 || idx >= order.length - 1) return
    const newOrder = [...order]
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    set('sticker_order', newOrder)
  }

  // ── Sticker globali ───────────────────────────────────────────────────────────

  function handleHide(id) {
    set('hidden_stickers', [...hiddenIds, id])
    if (draft.sticker_order) {
      set('sticker_order', draft.sticker_order.filter((x) => x !== id))
    }
    if (expandedId === id) setExpandedId(null)
  }

  function handleGlobalEdit(id, patch) {
    set('sticker_overrides', { ...overrides, [id]: { ...(overrides[id] ?? {}), ...patch } })
  }

  function handleResetOverride(id) {
    const updated = { ...overrides }
    delete updated[id]
    set('sticker_overrides', updated)
  }

  // ── Sticker locali ────────────────────────────────────────────────────────────

  function handleRemoveLocal(id) {
    set('stickers', (draft.stickers ?? []).filter((s) => s.id !== id))
    if (draft.sticker_order) {
      set('sticker_order', draft.sticker_order.filter((x) => x !== id))
    }
    if (expandedId === id) setExpandedId(null)
  }

  function handleLocalEdit(id, patch) {
    set('stickers', (draft.stickers ?? []).map((s) => s.id === id ? { ...s, ...patch } : s))
  }

  // ── Aggiungi locale ───────────────────────────────────────────────────────────

  function handleAdd() {
    const id = `local-${nanoid(8)}`
    const sticker = { ...NEW_STICKER_DEFAULTS, id }
    set('stickers', [...(draft.stickers ?? []), sticker])
    // Aggiunge alla fine dell'ordine (materializza se assente)
    const order = materializeOrder(draft, theme)
    set('sticker_order', [...order, id])
    setExpandedId(id)
  }

  // ── Ripristina globale nascosto ────────────────────────────────────────────────

  function handleRestore(id) {
    set('hidden_stickers', hiddenIds.filter((x) => x !== id))
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  const isEmpty = resolved.length === 0

  return (
    <div className="slide-sticker-panel">
      {isEmpty && (
        <p className="slide-sticker-panel__empty">
          Nessuno sticker in questa slide.<br />
          Aggiungi uno sticker globale dal pannello tema, oppure aggiungine uno solo qui sotto.
        </p>
      )}

      {/* Lista sticker visibili (risolti) */}
      <div className="slide-sticker-panel__list">
        {resolved.map((sticker, index) => {
          const isGlobal   = globalIds.has(sticker.id)
          const hasOverride = isGlobal && !!overrides[sticker.id]
          const isExpanded  = expandedId === sticker.id
          const canMoveUp   = index > 0
          const canMoveDown = index < resolved.length - 1
          const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

          function onEditorChange(patch) {
            if (isGlobal) {
              handleGlobalEdit(sticker.id, patch)
            } else {
              handleLocalEdit(sticker.id, patch)
            }
          }

          return (
            <div key={sticker.id} className={`slide-sticker-row${isExpanded ? ' slide-sticker-row--expanded' : ''}`}>
              <div className="slide-sticker-row__header">
                {/* Toggle expand */}
                <button
                  type="button"
                  className="slide-sticker-row__toggle"
                  onClick={() => handleToggleExpand(sticker.id)}
                  aria-expanded={isExpanded}
                >
                  <ChevronIcon size={13} className="slide-sticker-row__chevron" />
                  <span className="slide-sticker-row__thumb-wrap">
                    {sticker.data
                      ? <img src={sticker.data} alt="" className="slide-sticker-row__thumb" />
                      : <span className="slide-sticker-row__thumb-placeholder"><Image size={16} /></span>
                    }
                  </span>
                  <span className="slide-sticker-row__label">
                    Sticker {index + 1}
                    {isGlobal && (
                      <span className={`slide-sticker-row__badge${hasOverride ? ' slide-sticker-row__badge--modified' : ''}`}>
                        {hasOverride ? 'Globale (modif.)' : 'Globale'}
                      </span>
                    )}
                    {!isGlobal && (
                      <span className="slide-sticker-row__badge slide-sticker-row__badge--local">Solo qui</span>
                    )}
                  </span>
                </button>

                {/* Azioni */}
                <div className="slide-sticker-row__actions">
                  <button
                    type="button"
                    className="slide-sticker-row__action-btn"
                    onClick={() => handleMoveUp(sticker.id)}
                    disabled={!canMoveUp}
                    aria-label="Sposta su"
                    title="Sposta su"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    className="slide-sticker-row__action-btn"
                    onClick={() => handleMoveDown(sticker.id)}
                    disabled={!canMoveDown}
                    aria-label="Sposta giù"
                    title="Sposta giù"
                  >
                    <ArrowDown size={12} />
                  </button>

                  {isGlobal && hasOverride && (
                    <button
                      type="button"
                      className="slide-sticker-row__action-btn slide-sticker-row__action-btn--reset"
                      onClick={() => handleResetOverride(sticker.id)}
                      aria-label="Ripristina versione globale"
                      title="Ripristina versione globale"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}

                  {isGlobal && (
                    <button
                      type="button"
                      className="slide-sticker-row__action-btn slide-sticker-row__action-btn--hide"
                      onClick={() => handleHide(sticker.id)}
                      aria-label="Nascondi solo in questa slide"
                      title="Nascondi solo in questa slide"
                    >
                      <EyeOff size={12} />
                    </button>
                  )}

                  {!isGlobal && (
                    <button
                      type="button"
                      className="slide-sticker-row__action-btn slide-sticker-row__action-btn--remove"
                      onClick={() => handleRemoveLocal(sticker.id)}
                      aria-label="Rimuovi sticker"
                      title="Rimuovi sticker"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Corpo accordion con StickerEditor */}
              {isExpanded && (
                <div className="slide-sticker-row__body">
                  <StickerEditor
                    sticker={sticker}
                    onChange={onEditorChange}
                    userId={userId}
                    formatId={theme?.format}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pulsante aggiungi sticker locale */}
      <button
        type="button"
        className="slide-sticker-panel__add-btn"
        onClick={handleAdd}
      >
        <Plus size={13} />
        Aggiungi sticker (solo questa slide)
      </button>

      {/* Sezione sticker globali nascosti */}
      {hiddenGlobals.length > 0 && (
        <div className="slide-sticker-panel__hidden-section">
          <button
            type="button"
            className="slide-sticker-panel__hidden-toggle"
            onClick={() => setHiddenSectionOpen((v) => !v)}
          >
            {hiddenSectionOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Sticker globali nascosti in questa slide ({hiddenGlobals.length})
          </button>

          {hiddenSectionOpen && (
            <div className="slide-sticker-panel__hidden-list">
              {hiddenGlobals.map((sticker, index) => (
                <div key={sticker.id} className="slide-sticker-panel__hidden-row">
                  <span className="slide-sticker-panel__hidden-thumb-wrap">
                    {sticker.data
                      ? <img src={sticker.data} alt="" className="slide-sticker-panel__hidden-thumb" />
                      : <span className="slide-sticker-panel__hidden-thumb-placeholder"><Image size={14} /></span>
                    }
                  </span>
                  <span className="slide-sticker-panel__hidden-label">
                    Sticker globale {globalStickers.findIndex((s) => s.id === sticker.id) + 1}
                  </span>
                  <button
                    type="button"
                    className="slide-sticker-panel__restore-btn"
                    onClick={() => handleRestore(sticker.id)}
                    title="Ripristina sticker in questa slide"
                  >
                    <Eye size={12} />
                    Ripristina
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
