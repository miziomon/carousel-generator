import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn.js'

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
          'relative w-full rounded-xl shadow-2xl flex flex-col max-h-[90vh]',
          widths[size],
          className
        )}
        style={{ background: 'var(--app-bg-popup)' }}
      >
        {(title || onClose) && (
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(var(--app-fg-rgb), 0.12)' }}
          >
            {title && (
              <h2
                className="text-base font-semibold"
                style={{ color: 'var(--app-fg)' }}
              >
                {title}
              </h2>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1 rounded transition-colors"
                style={{ color: 'rgba(var(--app-fg-rgb), 0.5)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(var(--app-fg-rgb), 0.08)'
                  e.currentTarget.style.color = 'var(--app-fg)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(var(--app-fg-rgb), 0.5)'
                }}
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
