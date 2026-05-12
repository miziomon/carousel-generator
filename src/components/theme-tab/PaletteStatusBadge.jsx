import { AnimatePresence, motion } from 'framer-motion'

/**
 * Badge che indica il rapporto tra la palette corrente del carosello
 * e la palette di riferimento in libreria.
 *
 * Tre stati possibili:
 *   in-sync    — i colori sono identici alla palette di riferimento
 *   modificata — i colori sono divergiti dalla palette di riferimento
 *   custom     — nessun riferimento (palette_id e' null o palette eliminata)
 *
 * Usa AnimatePresence con mode="wait" per animare la transizione tra stati:
 * il badge uscente fa fade+scale-out prima che quello entrante appaia.
 *
 * @param {'in-sync'|'modificata'|'custom'} status
 */
export function PaletteStatusBadge({ status }) {
  const configs = {
    'in-sync':    { label: 'In sync',    mod: 'in-sync'    },
    'modificata': { label: 'Modificata', mod: 'modificata' },
    'custom':     { label: 'Custom',     mod: 'custom'     },
  }
  const config = configs[status] ?? { label: status, mod: 'custom' }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        className={'palette-status-badge palette-status-badge--' + config.mod}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.15 }}
      >
        {config.label}
      </motion.span>
    </AnimatePresence>
  )
}
