import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn.js'

/**
 * Modal generico con backdrop.
 * Chiude su Esc e su click esterno (se onClose è fornito).
 */
export function Modal({ open, onClose, title, children, size = 'md', className }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-full mx-4' }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        className={cn(
          'relative w-full bg-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh]',
          widths[size],
          className
        )}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
            {title && <h2 className="text-base font-semibold text-slate-100">{title}</h2>}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
