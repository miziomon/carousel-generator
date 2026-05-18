import { useRef, useCallback } from 'react'
import { Code2 } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import './custom-css-section.css'

/**
 * Sezione sidebar per il CSS personalizzato applicato globalmente a tutte le slide.
 * Usa una textarea monospace con debounce per non saturare la history dello store.
 */
export function CustomCssSection({ isOpen, onToggle, customCss, setCustomCss }) {
  const timerRef = useRef(null)

  const handleChange = useCallback((e) => {
    const value = e.target.value
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCustomCss(value), 400)
  }, [setCustomCss])

  return (
    <ThemeSection id="customCss" title="Custom CSS" icon={Code2} isOpen={isOpen} onToggle={onToggle}>
      <p className="custom-css-section__hint">
        Il CSS viene iniettato globalmente su tutte le slide. Usa selettori come{' '}
        <code>.slide</code>, <code>.editorial__body</code>, <code>.bold__body</code>.
      </p>
      <textarea
        className="custom-css-section__editor"
        defaultValue={customCss}
        onChange={handleChange}
        rows={10}
        spellCheck={false}
        autoComplete="off"
        placeholder={`.slide {\n  /* es: border-radius: 20px; */\n}`}
        aria-label="CSS personalizzato slide"
      />
    </ThemeSection>
  )
}
