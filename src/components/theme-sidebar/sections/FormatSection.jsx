import { Frame } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { FormatSelector } from '../../format-selector/FormatSelector.jsx'
import { toast } from '../../ui/Toast.jsx'

export function FormatSection({ isOpen, onToggle, theme, applyFormat }) {
  function handleSelect(formatId) {
    applyFormat(formatId)
    toast('Formato applicato. Le slide sono state riadattate.', 'success')
  }

  return (
    <ThemeSection id="formato" title="Formato" icon={Frame} isOpen={isOpen} onToggle={onToggle}>
      <FormatSelector currentId={theme.format} onSelect={handleSelect} />
    </ThemeSection>
  )
}
