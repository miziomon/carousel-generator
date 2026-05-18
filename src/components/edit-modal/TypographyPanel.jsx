import { FONTS } from '../../lib/fonts/registry.js'
import { RadioGroup } from './FieldGroup.jsx'
import './typography-panel.css'

const FONT_OPTIONS = [
  { value: 'primary',   label: 'Primario' },
  { value: 'secondary', label: 'Secondario' },
  { value: 'mono',      label: 'Monospace' },
]

const MIN_SIZE = 8
const MAX_SIZE = 120

/**
 * Pannello tipografia per-slide nell'EditModal.
 * Permette di scegliere slot, font specifico e dimensione,
 * sovrascrivendo le impostazioni globali del tema per questa sola slide.
 */
export function TypographyPanel({ draft, theme, set }) {
  const sizes = theme.fonts?.sizes ?? { primary: 68, secondary: 68, mono: 18 }
  const activeSlot = draft.font ?? 'primary'
  const globalSize = sizes[activeSlot] ?? 68

  function handleFontIdOverride(e) {
    const val = e.target.value
    set('font_id_override', val === '' ? undefined : val)
  }

  function handleSizeToggle(e) {
    if (!e.target.checked) {
      set('font_size_override', undefined)
    } else {
      set('font_size_override', globalSize)
    }
  }

  function handleSizeSlider(e) {
    set('font_size_override', Number(e.target.value))
  }

  function handleSizeInput(e) {
    const parsed = parseInt(e.target.value, 10)
    if (!isNaN(parsed)) {
      const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed))
      set('font_size_override', clamped)
    }
  }

  const hasSizeOverride = draft.font_size_override !== undefined && draft.font_size_override !== null
  const currentSize = hasSizeOverride ? draft.font_size_override : globalSize

  return (
    <div className="typography-panel">
      {/* Slot */}
      <div className="typography-panel__group">
        <label className="typography-panel__label">Slot font</label>
        <RadioGroup
          name={`font-slot-${draft.id}`}
          value={draft.font}
          onChange={(v) => set('font', v)}
          options={FONT_OPTIONS}
        />
      </div>

      {/* Font specifico (override) */}
      <div className="typography-panel__group">
        <label className="typography-panel__label">
          Font specifico
          <span className="typography-panel__badge">override</span>
        </label>
        <select
          className="typography-panel__select"
          value={draft.font_id_override ?? ''}
          onChange={handleFontIdOverride}
        >
          <option value="">— usa tema —</option>
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Dimensione (override) */}
      <div className="typography-panel__group">
        <label className="typography-panel__label">
          Dimensione base
          <span className="typography-panel__badge">override</span>
        </label>
        <div className="typography-panel__size-toggle">
          <label className="typography-panel__check-label">
            <input
              type="checkbox"
              checked={hasSizeOverride}
              onChange={handleSizeToggle}
            />
            Personalizza dimensione
          </label>
        </div>
        {hasSizeOverride ? (
          <div className="typography-panel__size-row">
            <input
              type="range"
              min={MIN_SIZE}
              max={MAX_SIZE}
              step={1}
              value={currentSize}
              onChange={handleSizeSlider}
              className="typography-panel__range"
            />
            <input
              type="number"
              min={MIN_SIZE}
              max={MAX_SIZE}
              value={currentSize}
              onChange={handleSizeInput}
              className="typography-panel__num"
            />
            <span className="typography-panel__unit">px</span>
          </div>
        ) : (
          <p className="typography-panel__inherited">
            Dal tema: {globalSize}px (slot {activeSlot})
          </p>
        )}
      </div>
    </div>
  )
}
