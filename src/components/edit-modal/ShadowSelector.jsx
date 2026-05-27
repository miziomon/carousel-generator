import { ColorPicker } from '../theme-tab/ColorPicker.jsx'
import { SHADOW_PRESETS, resolveTextShadow } from '../../slide-renderer/templates/_shared/textShadowPresets.js'
import './shadow-selector.css'

// Anteprime visive dei preset: piccoli quadrati con text-shadow applicata al testo
const PRESET_LABELS = {
  none:       'Nessuna',
  soft:       'Soft',
  'soft-lg':  'Soft ampia',
  drop:       'Drop',
  'hard-thin':'Hard sottile',
  'hard-bold':'Hard marcata',
}

function PresetButton({ presetKey, currentPreset, color, onSelect }) {
  const isActive  = currentPreset === presetKey
  const shadow    = resolveTextShadow({ preset: presetKey, color })

  return (
    <button
      type="button"
      title={PRESET_LABELS[presetKey]}
      onClick={() => onSelect(presetKey)}
      className={`shadow-selector__preset ${isActive ? 'shadow-selector__preset--active' : ''}`}
    >
      <span
        className="shadow-selector__preview-text"
        style={{ textShadow: shadow }}
        aria-hidden="true"
      >
        Aa
      </span>
    </button>
  )
}

/**
 * Selettore ombreggiatura testo: riga di preset + color picker per il colore dell'ombra.
 *
 * @param {{ value, onChange }} props
 *   value  — { preset: string, color: string } oppure undefined (= nessuna ombra)
 *   onChange — (newValue | undefined) => void
 */
export function ShadowSelector({ value, onChange }) {
  const currentPreset = value?.preset ?? 'none'
  const currentColor  = value?.color  ?? '#000000'

  function handlePreset(preset) {
    if (preset === 'none') {
      onChange(undefined)
    } else {
      onChange({ preset, color: currentColor })
    }
  }

  function handleColor(color) {
    onChange({ preset: currentPreset === 'none' ? 'soft' : currentPreset, color })
  }

  return (
    <div className="shadow-selector">
      <div className="shadow-selector__row">
        {SHADOW_PRESETS.map((p) => (
          <PresetButton
            key={p}
            presetKey={p}
            currentPreset={currentPreset}
            color={currentColor}
            onSelect={handlePreset}
          />
        ))}
      </div>

      {currentPreset !== 'none' && (
        <div className="shadow-selector__color">
          <ColorPicker
            label="Colore ombra"
            value={currentColor}
            onChange={handleColor}
          />
        </div>
      )}
    </div>
  )
}
