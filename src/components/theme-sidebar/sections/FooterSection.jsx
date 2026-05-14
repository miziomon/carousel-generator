import { useCallback } from 'react'
import { PanelBottom } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { FieldGroup, TextInput, Toggle } from '../../edit-modal/FieldGroup.jsx'

export function FooterSection({ isOpen, onToggle, theme, onChange }) {
  const setNested = useCallback(
    (key, value) => onChange({ ...theme, footer: { ...theme.footer, [key]: value } }),
    [theme, onChange]
  )

  return (
    <ThemeSection id="footer" title="Footer" icon={PanelBottom} isOpen={isOpen} onToggle={onToggle}>
      <FieldGroup label="Nome autore">
        <TextInput
          value={theme.footer.name}
          onChange={(v) => setNested('name', v)}
        />
      </FieldGroup>
      <Toggle
        checked={theme.footer.show_separator_line}
        onChange={(v) => setNested('show_separator_line', v)}
        label="Mostra linea separatrice"
      />
      <Toggle
        checked={theme.footer.show_meta_number}
        onChange={(v) => setNested('show_meta_number', v)}
        label="Mostra numerazione (es. 03 / 12)"
      />
    </ThemeSection>
  )
}
