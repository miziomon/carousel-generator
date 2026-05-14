import { useCallback } from 'react'
import { Type } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { FieldGroup, TextInput } from '../../edit-modal/FieldGroup.jsx'

export function FontsSection({ isOpen, onToggle, theme, onChange }) {
  const setNested = useCallback(
    (key, value) => onChange({ ...theme, fonts: { ...theme.fonts, [key]: value } }),
    [theme, onChange]
  )

  return (
    <ThemeSection id="fonts" title="Fonts" icon={Type} isOpen={isOpen} onToggle={onToggle}>
      <FieldGroup label="Font principale (titoli)">
        <TextInput
          value={theme.fonts.primary}
          onChange={(v) => setNested('primary', v)}
        />
      </FieldGroup>
      <FieldGroup label="Font secondario (corpo)">
        <TextInput
          value={theme.fonts.secondary}
          onChange={(v) => setNested('secondary', v)}
        />
      </FieldGroup>
      <FieldGroup label="Font monospace (UI slide)">
        <TextInput
          value={theme.fonts.mono}
          onChange={(v) => setNested('mono', v)}
        />
      </FieldGroup>
    </ThemeSection>
  )
}
