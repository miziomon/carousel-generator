import { useRef, useState, useCallback } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { cn } from '../../lib/cn.js'

// Tag inline disponibili nella toolbar
const TOOLBAR_TAGS = [
  { tag: 'hl',   label: 'Verde',        shortcut: 'Ctrl+B' },
  { tag: 'soft', label: 'Crema',        shortcut: null },
  { tag: 'c',    label: 'Solo colore',  shortcut: null },
  { tag: 'u',    label: 'Sottolineato', shortcut: null },
  { tag: 'em',   label: 'Corsivo',      shortcut: 'Ctrl+I' },
]

/**
 * Inserisce tag inline attorno alla selezione (o al cursore se non c'è selezione).
 * Ripristina focus e posizione cursore dopo l'insert.
 */
function insertTagAtCursor(el, tag, currentValue, onChange) {
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = currentValue.slice(start, end)
  const before = currentValue.slice(0, start)
  const after = currentValue.slice(end)
  const newValue = `${before}[${tag}]${selected}[/${tag}]${after}`
  onChange(newValue)

  // Ripristina focus e seleziona il testo appena wrappato
  requestAnimationFrame(() => {
    el.focus()
    const tagOpen = `[${tag}]`.length
    const newStart = start + tagOpen
    const newEnd = newStart + selected.length
    el.setSelectionRange(newStart, newEnd)
  })
}

// Singola riga con textarea + drag handle + delete
function LineRow({ value, index, isFocused, onFocus, onChange, onDelete, onKeyDown, textareaRef }) {
  return (
    <div className={cn('flex gap-1.5 items-start group', isFocused && 'relative z-10')}>
      {/* Drag handle placeholder — il drag DnD arriva in Fase 4 */}
      <div className="mt-2 opacity-30 cursor-grab select-none text-slate-500 text-xs">⠿</div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        rows={2}
        className={cn(
          'flex-1 bg-slate-900 border rounded px-3 py-2 text-sm text-slate-100 font-mono resize-y min-h-[2.5rem]',
          'focus:outline-none transition-colors leading-relaxed',
          isFocused ? 'border-emerald-500/60' : 'border-slate-600 hover:border-slate-500'
        )}
        placeholder={value === '' ? '(riga vuota = spazio extra)' : undefined}
      />

      <button
        onClick={() => onDelete(index)}
        className="mt-2 p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-slate-500 transition-all"
        title="Elimina riga"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// Toolbar tag inline — appare sopra la riga focused
function InlineToolbar({ onInsert }) {
  return (
    <div className="flex flex-wrap gap-1 pb-1.5">
      {TOOLBAR_TAGS.map(({ tag, label, shortcut }) => (
        <button
          key={tag}
          onMouseDown={(e) => {
            // mousedown invece di click: evita che textarea perda il focus prima dell'insert
            e.preventDefault()
            onInsert(tag)
          }}
          className="px-2 py-0.5 text-[10px] font-mono rounded border border-slate-600 text-slate-400 hover:border-emerald-500/60 hover:text-emerald-400 transition-colors"
          title={shortcut ?? `Inserisce [${tag}]...[/${tag}]`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function LinesEditor({ lines, onChange }) {
  const [focusedIdx, setFocusedIdx] = useState(null)
  const textareaRefs = useRef([])

  const handleChange = useCallback((idx, val) => {
    const next = [...lines]
    next[idx] = val
    onChange(next)
  }, [lines, onChange])

  const handleDelete = useCallback((idx) => {
    if (lines.length <= 1) return  // almeno 1 riga
    const next = lines.filter((_, i) => i !== idx)
    onChange(next)
    setFocusedIdx(null)
  }, [lines, onChange])

  const handleAddLine = useCallback(() => {
    onChange([...lines, 'Nuova riga'])
    // Focus sulla nuova riga dopo render
    requestAnimationFrame(() => {
      const idx = lines.length
      textareaRefs.current[idx]?.focus()
      textareaRefs.current[idx]?.select()
    })
  }, [lines, onChange])

  const handleAddEmpty = useCallback(() => {
    onChange([...lines, ''])
  }, [lines, onChange])

  function handleKeyDown(e, idx) {
    const isMac = navigator.platform.includes('Mac')
    const ctrl = isMac ? e.metaKey : e.ctrlKey

    if (ctrl && e.key === 'b') {
      e.preventDefault()
      const el = textareaRefs.current[idx]
      if (el) insertTagAtCursor(el, 'hl', lines[idx], (v) => handleChange(idx, v))
    }
    if (ctrl && e.key === 'i') {
      e.preventDefault()
      const el = textareaRefs.current[idx]
      if (el) insertTagAtCursor(el, 'em', lines[idx], (v) => handleChange(idx, v))
    }
  }

  function handleInsertTag(tag) {
    if (focusedIdx === null) return
    const el = textareaRefs.current[focusedIdx]
    if (el) insertTagAtCursor(el, tag, lines[focusedIdx], (v) => handleChange(focusedIdx, v))
  }

  return (
    <div className="flex flex-col gap-2">
      {focusedIdx !== null && <InlineToolbar onInsert={handleInsertTag} />}

      {lines.map((line, idx) => (
        <LineRow
          key={idx}
          value={line}
          index={idx}
          isFocused={focusedIdx === idx}
          onFocus={() => setFocusedIdx(idx)}
          onChange={handleChange}
          onDelete={handleDelete}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          textareaRef={(el) => { textareaRefs.current[idx] = el }}
        />
      ))}

      <div className="flex gap-2 mt-1">
        <button
          onClick={handleAddLine}
          className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-emerald-500/40"
        >
          <Plus size={11} /> Aggiungi riga
        </button>
        <button
          onClick={handleAddEmpty}
          className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-300 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
          title="Inserisce una riga vuota per creare spazio extra tra i paragrafi"
        >
          <Plus size={11} /> Riga vuota (spazio)
        </button>
      </div>
    </div>
  )
}
