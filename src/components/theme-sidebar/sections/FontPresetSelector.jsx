import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { FONT_PRESETS } from '../../../lib/fonts/presets.js'

export function FontPresetSelector({ currentFonts, onApplyPreset }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const activePreset = FONT_PRESETS.find(
    (p) =>
      p.fonts.primary   === currentFonts?.primary &&
      p.fonts.secondary === currentFonts?.secondary &&
      p.fonts.mono      === currentFonts?.mono
  )

  return (
    <div className="fonts-section__preset-wrap" ref={wrapRef}>
      <div className="fonts-section__preset-label">Preset pairing</div>
      <button
        type="button"
        className="fonts-section__preset-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{activePreset ? activePreset.label : 'Personalizzato'}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="fonts-section__preset-panel">
          {FONT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="fonts-section__preset-option"
              onClick={() => {
                onApplyPreset(preset.id)
                setOpen(false)
              }}
            >
              <span className="fonts-section__preset-option-name">{preset.label}</span>
              <span className="fonts-section__preset-option-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
