import { useState, useEffect, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'
import { cn } from '../../lib/cn.js'

/**
 * Swatch cliccabile + input testuale + picker HexColorPicker.
 * Supporta sia hex (#rrggbb) sia rgba(...) — per rgba usa solo input testuale.
 */
export function ColorPicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const isRgba = value?.startsWith('rgba') || value?.startsWith('rgb(')

  // Chiude il picker se si clicca fuori
  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Valore hex "sicuro" per il picker: estrae il colore senza alpha se rgba
  const safeHex = isRgba ? '#888888' : (value ?? '#000000')

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-mono tracking-wider uppercase text-slate-400">{label}</label>
      )}
      <div className="flex items-center gap-2">
        {/* Swatch cliccabile */}
        <button
          onClick={() => !isRgba && setOpen((v) => !v)}
          title={isRgba ? 'Modifica il valore nell\'input a destra' : 'Apri color picker'}
          className={cn(
            'w-7 h-7 rounded border border-slate-600 flex-shrink-0 transition-transform',
            !isRgba && 'hover:scale-110 cursor-pointer',
            isRgba && 'cursor-default opacity-80'
          )}
          style={{ background: value }}
        />
        {/* Input testuale (valore raw) */}
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500/60 transition-colors"
          spellCheck={false}
        />
      </div>
      {/* Picker hex — solo per valori non-rgba */}
      {open && !isRgba && (
        <div className="mt-1 z-50">
          <HexColorPicker color={safeHex} onChange={onChange} />
        </div>
      )}
      {isRgba && (
        <p className="text-[10px] text-slate-500 font-mono">Valore rgba: modifica direttamente nell'input</p>
      )}
    </div>
  )
}
