import { useRef, useCallback } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { cn } from '../../lib/cn.js'

/**
 * Editor semplificato per l'array cta_items.
 * Non supporta tag inline (il brief specifica "stringhe brevi").
 */
export function CtaItemsEditor({ items, onChange }) {
  const inputRefs = useRef([])

  const handleChange = useCallback((idx, val) => {
    const next = [...items]
    next[idx] = val
    onChange(next)
  }, [items, onChange])

  const handleDelete = useCallback((idx) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== idx))
  }, [items, onChange])

  const handleAdd = useCallback(() => {
    onChange([...items, ''])
    requestAnimationFrame(() => inputRefs.current[items.length]?.focus())
  }, [items, onChange])

  function handleKeyDown(e, idx) {
    // Enter aggiunge una nuova riga
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
    // Backspace su riga vuota la elimina e torna alla precedente
    if (e.key === 'Backspace' && items[idx] === '' && items.length > 1) {
      e.preventDefault()
      handleDelete(idx)
      requestAnimationFrame(() => inputRefs.current[idx - 1]?.focus())
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-1.5 items-center group">
          <div className="opacity-30 text-slate-500 text-xs select-none">⠿</div>
          <input
            ref={(el) => { inputRefs.current[idx] = el }}
            type="text"
            value={item}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder="es. → Link in bio"
            className={cn(
              'flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100 font-mono',
              'focus:outline-none focus:border-emerald-500/60 transition-colors hover:border-slate-500'
            )}
          />
          <button
            onClick={() => handleDelete(idx)}
            disabled={items.length <= 1}
            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-slate-500 transition-all disabled:pointer-events-none"
            title="Elimina item"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-emerald-500/40 w-fit"
      >
        <Plus size={11} /> Aggiungi item
      </button>
    </div>
  )
}
