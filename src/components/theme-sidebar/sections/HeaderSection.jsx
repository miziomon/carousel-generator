import { useCallback } from 'react'
import { PanelTop } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { FieldGroup, TextInput, Toggle } from '../../edit-modal/FieldGroup.jsx'

export function HeaderSection({ isOpen, onToggle, theme, onChange }) {
  const setNested = useCallback(
    (key, value) => onChange({ ...theme, header: { ...theme.header, [key]: value } }),
    [theme, onChange]
  )

  return (
    <ThemeSection id="header" title="Header" icon={PanelTop} isOpen={isOpen} onToggle={onToggle}>
      <FieldGroup label="Kicker default" help="Testo mostrato nelle slide senza kicker personalizzato">
        <TextInput
          value={theme.header.kicker_default}
          onChange={(v) => setNested('kicker_default', v)}
        />
      </FieldGroup>
      <Toggle
        checked={theme.header.show_topline}
        onChange={(v) => setNested('show_topline', v)}
        label="Mostra linea in cima"
      />
      <Toggle
        checked={theme.header.show_dot}
        onChange={(v) => setNested('show_dot', v)}
        label="Mostra punto accento (in alto a destra)"
      />
      <Toggle
        checked={theme.header.show_meta_number !== false}
        onChange={(v) => setNested('show_meta_number', v)}
        label="Mostra numerazione (es. 03 / 12)"
      />
    </ThemeSection>
  )
}
