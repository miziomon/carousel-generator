import { Type } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { FontDropdown } from './FontDropdown.jsx'
import { FontPresetSelector } from './FontPresetSelector.jsx'
import { FontSizeSlider } from './FontSizeSlider.jsx'
import './fonts-section.css'

export function FontsSection({
  isOpen,
  onToggle,
  theme,
  fontShowAll,
  onSetFontShowAll,
  onApplyFont,
  onApplyFontPreset,
  onPreviewFont,
  onClearFontPreview,
  onApplyFontSize,
}) {
  const sizes = theme.fonts?.sizes ?? { primary: 68, secondary: 68, mono: 18 }

  const slots = [
    { key: 'primary',   label: 'Primario (titoli)' },
    { key: 'secondary', label: 'Secondario (corpo)' },
    { key: 'mono',      label: 'Monospace' },
  ]

  return (
    <ThemeSection id="fonts" title="Fonts" icon={Type} isOpen={isOpen} onToggle={onToggle}>
      <FontPresetSelector
        currentFonts={theme.fonts}
        onApplyPreset={onApplyFontPreset}
      />

      <div className="fonts-section__slots">
        {slots.map(({ key, label }) => (
          <div key={key} className="fonts-section__slot">
            <span className="fonts-section__slot-label">{label}</span>
            <FontDropdown
              slot={key}
              currentFontId={theme.fonts?.[key]}
              showAll={fontShowAll}
              onApply={onApplyFont}
              onPreview={onPreviewFont}
              onClearPreview={onClearFontPreview}
            />
            <FontSizeSlider
              slot={key}
              value={sizes[key] ?? 68}
              onChange={onApplyFontSize}
            />
          </div>
        ))}
      </div>

      <label className="fonts-section__show-all">
        <input
          type="checkbox"
          checked={!!fontShowAll}
          onChange={(e) => onSetFontShowAll(e.target.checked)}
        />
        Mostra tutti i font
      </label>
    </ThemeSection>
  )
}
