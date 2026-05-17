import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { FONTS } from '../../../lib/fonts/registry.js'
import { FONT_CATEGORIES } from '../../../lib/fonts/categories.js'
import { preloadAllFonts } from '../../../lib/fonts/preload.js'

// Raggruppa un array di font per categoria, preservando l'ordine dei gruppi
function groupByCategory(fonts) {
  const groups = {}
  for (const font of fonts) {
    if (!groups[font.category]) groups[font.category] = []
    groups[font.category].push(font)
  }
  return groups
}

export function FontDropdown({ slot, currentFontId, showAll, onApply, onPreview, onClearPreview }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Precarica i font al primo open
  useEffect(() => {
    if (open) preloadAllFonts()
  }, [open])

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onClearPreview()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClearPreview])

  // Determina quali font mostrare e quali sono off-role
  const nativeFonts = FONTS.filter((f) => FONT_CATEGORIES[f.category].roles.includes(slot))
  const offRoleFonts = FONTS.filter((f) => !FONT_CATEGORIES[f.category].roles.includes(slot))

  // Per mono mostriamo solo i font nativi (1 solo gruppo), showAll non ha effetto
  const visibleFonts = slot === 'mono'
    ? nativeFonts
    : showAll
      ? FONTS
      : nativeFonts

  const offRoleIds = new Set(offRoleFonts.map((f) => f.id))
  const grouped = groupByCategory(visibleFonts)
  const categoryOrder = ['display', 'sans', 'serif', 'mono']

  const currentFont = FONTS.find((f) => f.id === currentFontId) ?? FONTS[0]

  return (
    <div className="font-dropdown" ref={wrapRef}>
      <button
        type="button"
        className="font-dropdown__btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ fontFamily: currentFont.css_family }}
      >
        <span className="font-dropdown__btn-text">{currentFont.label}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          className="font-dropdown__panel"
          onMouseLeave={() => onClearPreview()}
        >
          {categoryOrder.map((cat) => {
            const fontsInCat = grouped[cat]
            if (!fontsInCat || fontsInCat.length === 0) return null
            return (
              <div key={cat}>
                <div className="font-dropdown__category-header">
                  {FONT_CATEGORIES[cat].label}
                </div>
                {fontsInCat.map((font) => {
                  const isActive = font.id === currentFontId
                  const isOffRole = offRoleIds.has(font.id)
                  return (
                    <button
                      key={font.id}
                      type="button"
                      className="font-dropdown__option"
                      style={{ fontFamily: font.css_family }}
                      onMouseEnter={() => onPreview(slot, font.id)}
                      onClick={() => {
                        onApply(slot, font.id)
                        onClearPreview()
                        setOpen(false)
                      }}
                    >
                      <span className="font-dropdown__check">
                        {isActive && <Check size={11} />}
                      </span>
                      <span className="font-dropdown__option-name">{font.label}</span>
                      {isOffRole && (
                        <span className="font-dropdown__offrole" title="Font fuori dal ruolo consigliato">
                          ⚠
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
