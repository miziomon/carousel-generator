import { ChevronRight } from 'lucide-react'
import './theme-sidebar.css'

export function ThemeSidebarRail({ onOpen }) {
  return (
    <div
      className="theme-sidebar__rail"
      onClick={onOpen}
      title="Apri pannello Tema (Ctrl+B)"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
    >
      <ChevronRight size={14} className="theme-sidebar__rail-icon" />
    </div>
  )
}
