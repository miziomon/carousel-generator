import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { PaletteThumbnail } from './PaletteThumbnail.jsx'

/**
 * Selettore palette con dropdown custom.
 * Mostra thumbnail 6 quadratini + nome per ogni opzione.
 * Le palette system e user sono visivamente distinte con label di gruppo.
 *
 * @param {Array<object>} paletteLibrary  — array Palette (built-in + user)
 * @param {string|null}   currentId       — id della palette attualmente applicata (o null)
 * @param {Function}      onSelect        — callback(paletteId) quando l'utente seleziona
 */
export function PaletteSelector({ paletteLibrary, currentId, onSelect }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Chiude il dropdown se si clicca fuori dal componente o si preme Esc
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

  // Palette attualmente selezionata (puo' essere undefined se id e' null)
  const current = paletteLibrary.find((p) => p.id === currentId)

  const systemPalettes = paletteLibrary.filter((p) => p.origin === 'system')
  const userPalettes   = paletteLibrary.filter((p) => p.origin === 'user')

  function handleSelect(id) {
    onSelect(id)
    setOpen(false)
  }

  return (
    <div className="palette-selector" ref={containerRef}>
      {/* -- Trigger -- */}
      <button
        type="button"
        className="palette-selector__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current ? (
          <>
            <PaletteThumbnail colors={current.colors} size={16} />
            <span className="palette-selector__trigger-name">{current.name}</span>
            {current.origin === 'system' && (
              <span className="palette-selector__badge palette-selector__badge--system">
                System
              </span>
            )}
          </>
        ) : (
          <span className="palette-selector__trigger-name palette-selector__trigger-name--none">
            — Nessuna palette —
          </span>
        )}
        <ChevronDown size={14} className="palette-selector__chevron" />
      </button>

      {/* -- Dropdown — avvolto in AnimatePresence per slide-down in entrata/uscita -- */}
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
            {/* Sezione built-in (sempre presente) */}
            <div className="palette-selector__group-label">Palette di sistema</div>
            {systemPalettes.map((p) => (
              <PaletteOption
                key={p.id}
                palette={p}
                selected={p.id === currentId}
                onSelect={handleSelect}
              />
            ))}

            {/* Sezione user (mostrata solo se esistono palette personalizzate) */}
            {userPalettes.length > 0 && (
              <>
                <div className="palette-selector__group-label">Le mie palette</div>
                {userPalettes.map((p) => (
                  <PaletteOption
                    key={p.id}
                    palette={p}
                    selected={p.id === currentId}
                    onSelect={handleSelect}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Singola riga opzione dentro il dropdown.
 *
 * @param {object}   palette  — oggetto palette
 * @param {boolean}  selected — se attualmente selezionata
 * @param {Function} onSelect — callback(id)
 */
function PaletteOption({ palette, selected, onSelect }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={'palette-selector__option' + (selected ? ' palette-selector__option--active' : '')}
      onClick={() => onSelect(palette.id)}
    >
      <PaletteThumbnail colors={palette.colors} size={16} />
      <span className="palette-selector__option-name">{palette.name}</span>
    </button>
  )
}
