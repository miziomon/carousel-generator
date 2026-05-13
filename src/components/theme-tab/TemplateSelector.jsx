import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { TEMPLATES } from '../../slide-renderer/templates/registry.js'

/**
 * Selettore template con dropdown custom, parallelo a PaletteSelector.
 * I template sono solo di sistema (no user), quindi nessuna separazione di gruppo.
 *
 * @param {string}   currentId  — theme.template_id corrente
 * @param {Function} onSelect   — callback(templateId) quando l'utente seleziona
 */
export function TemplateSelector({ currentId, onSelect }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const current = TEMPLATES.find((t) => t.id === currentId) ?? TEMPLATES[0]

  function handleSelect(id) {
    onSelect(id)
    setOpen(false)
  }

  return (
    <div className="palette-selector" ref={containerRef}>
      <button
        type="button"
        className="palette-selector__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="palette-selector__trigger-name">{current?.name ?? '—'}</span>
        {current?.origin === 'system' && (
          <span className="palette-selector__badge palette-selector__badge--system">System</span>
        )}
        <ChevronDown size={14} className="palette-selector__chevron" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="palette-selector__dropdown"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {TEMPLATES.map((t) => (
              <TemplateOption
                key={t.id}
                template={t}
                selected={t.id === current?.id}
                onSelect={handleSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TemplateOption({ template, selected, onSelect }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={'palette-selector__option template-selector__option' + (selected ? ' palette-selector__option--active' : '')}
      onClick={() => onSelect(template.id)}
    >
      <div className="template-selector__option-body">
        <span className="palette-selector__option-name">{template.name}</span>
        {template.description && (
          <span className="template-selector__option-desc">{template.description}</span>
        )}
      </div>
    </button>
  )
}
