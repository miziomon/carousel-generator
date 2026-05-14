import { ChevronLeft } from 'lucide-react'
import './theme-sidebar.css'

export function ThemeSidebarHeader({ onToggle }) {
  return (
    <div className="theme-sidebar__header">
      <span className="theme-sidebar__title">Tema</span>
      <button
        type="button"
        className="theme-sidebar__toggle"
        onClick={onToggle}
        title="Chiudi pannello Tema (Ctrl+B)"
        aria-label="Chiudi pannello Tema"
      >
        <ChevronLeft size={14} />
      </button>
    </div>
  )
}
