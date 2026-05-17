import { Type } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { FontDropdown } from './FontDropdown.jsx'
import { FontPresetSelector } from './FontPresetSelector.jsx'
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
}) {
  return (
    <ThemeSection id="fonts" title="Fonts" icon={Type} isOpen={isOpen} onToggle={onToggle}>
      <FontPresetSelector
        currentFonts={theme.fonts}
        onApplyPreset={onApplyFontPreset}
      />

      <div className="fonts-section__slots">
        <div className="fonts-section__slot">
          <span className="fonts-section__slot-label">Primario (titoli)</span>
          <FontDropdown
            slot="primary"
            currentFontId={theme.fonts?.primary}
            showAll={fontShowAll}
            onApply={onApplyFont}
            onPreview={onPreviewFont}
            onClearPreview={onClearFontPreview}
          />
        </div>

        <div className="fonts-section__slot">
          <span className="fonts-section__slot-label">Secondario (corpo)</span>
          <FontDropdown
            slot="secondary"
            currentFontId={theme.fonts?.secondary}
            showAll={fontShowAll}
            onApply={onApplyFont}
            onPreview={onPreviewFont}
            onClearPreview={onClearFontPreview}
          />
        </div>

        <div className="fonts-section__slot">
          <span className="fonts-section__slot-label">Monospace</span>
          <FontDropdown
            slot="mono"
            currentFontId={theme.fonts?.mono}
            showAll={fontShowAll}
            onApply={onApplyFont}
            onPreview={onPreviewFont}
            onClearPreview={onClearFontPreview}
          />
        </div>
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
