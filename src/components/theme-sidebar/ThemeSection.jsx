import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import './theme-sidebar.css'

/**
 * Sezione collassabile della sidebar. Accetta un id, title, icon e isOpen/onToggle.
 * onToggle(id, newOpen) — la gestione dello stato vive in App tramite useUiPreferences.
 */
export function ThemeSection({ id, title, icon: Icon, isOpen, onToggle, children }) {
  return (
    <div className={`theme-section${isOpen ? ' theme-section--expanded' : ''}`}>
      <button
        type="button"
        className="theme-section__header"
        onClick={() => onToggle(id, !isOpen)}
        aria-expanded={isOpen}
      >
        {Icon && <Icon size={13} className="theme-section__icon" />}
        <span className="theme-section__title">{title}</span>
        {isOpen
          ? <ChevronDown size={12} className="theme-section__chevron" />
          : <ChevronRight size={12} className="theme-section__chevron" />
        }
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="theme-section__body"
          >
            <div className="theme-section__body-inner">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
