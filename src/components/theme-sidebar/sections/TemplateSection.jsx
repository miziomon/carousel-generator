import { LayoutTemplate } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { TemplateSelector } from '../../theme-tab/TemplateSelector.jsx'

export function TemplateSection({ isOpen, onToggle, theme, openTemplateManager }) {
  return (
    <ThemeSection id="template" title="Template" icon={LayoutTemplate} isOpen={isOpen} onToggle={onToggle}>
      <TemplateSelector currentId={theme.template_id} onOpenModal={openTemplateManager} />
    </ThemeSection>
  )
}
