import { cn } from '../../lib/cn.js'
import './tab-bar.css'

const TABS = [
  { id: 'slides', label: 'Slide' },
  { id: 'theme',  label: 'Tema' },
  { id: 'json',   label: 'JSON' },
]

export function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className="tab-bar" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={cn(
            'tab-bar__tab',
            activeTab === tab.id && 'tab-bar__tab--active',
            tab.disabled && 'tab-bar__tab--disabled'
          )}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
