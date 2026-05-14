import { LayoutTemplate } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { TemplateSelector } from '../../theme-tab/TemplateSelector.jsx'
import { Button } from '../../ui/Button.jsx'
import { toast } from '../../ui/Toast.jsx'
import { TEMPLATES } from '../../../slide-renderer/templates/registry.js'

export function TemplateSection({ isOpen, onToggle, theme, applyTemplate, openTemplateManager, paletteLibrary, applyPalette }) {
  function handleApplyTemplate(templateId) {
    applyTemplate(templateId)
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    const defaultPaletteId = template.default_palette_id
    const suggestionNeeded = defaultPaletteId && defaultPaletteId !== theme.palette_id
    const defaultPalette = suggestionNeeded
      ? paletteLibrary.find((p) => p.id === defaultPaletteId)
      : null

    if (defaultPalette) {
      toast(
        `Template "${template.name}" applicato`,
        'success',
        { label: `Applica palette consigliata: ${defaultPalette.name}`, onClick: () => applyPalette(defaultPaletteId) }
      )
    } else {
      toast(`Template "${template.name}" applicato`)
    }
  }

  return (
    <ThemeSection id="template" title="Template" icon={LayoutTemplate} isOpen={isOpen} onToggle={onToggle}>
      <TemplateSelector currentId={theme.template_id} onSelect={handleApplyTemplate} />
      <Button size="xs" variant="ghost" onClick={openTemplateManager}>
        Gestisci template...
      </Button>
    </ThemeSection>
  )
}
