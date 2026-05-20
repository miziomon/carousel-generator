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
  onApplyLineHeight,
}) {
  const sizes = theme.fonts?.sizes ?? { primary: 68, secondary: 68, mono: 18 }
  const lineHeight = theme.lineHeight ?? 1

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

      {onApplyLineHeight && (
        <div className="fonts-section__lh-row">
          <div className="fonts-section__lh-header">
            <span className="fonts-section__slot-label">Interlinea</span>
            <span className="fonts-section__lh-value">{lineHeight.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.6}
            max={2.5}
            step={0.05}
            value={lineHeight}
            onChange={(e) => onApplyLineHeight(Number(e.target.value))}
            className="fonts-section__lh-range"
            aria-label="Moltiplicatore interlinea globale"
          />
        </div>
      )}

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
