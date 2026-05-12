import { useState, useEffect, useCallback, useRef } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { validateJson } from '../../lib/validateJson.js'
import { slugifyTitle } from '../../lib/filename.js'
import { Button } from '../ui/Button.jsx'
import { toast } from '../ui/Toast.jsx'
import './json-tab.css'

function serializeCarousel(carousel) {
  return JSON.stringify(
    { ...carousel, slides: carousel.slides.map(({ id: _id, ...rest }) => rest) },
    null,
    2
  )
}

// Syntax highlighting minimale via regex — produce HTML sicuro (escape prima)
function highlightJson(text) {
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return safe.replace(
    /("(?:\\.|[^"\\])*")(\s*:)|("(?:\\.|[^"\\])*")|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g,
    (_, key, colon, str, bool, num, punct) => {
      if (key  !== undefined) return `<span class="jh-key">${key}</span>${colon}`
      if (str  !== undefined) return `<span class="jh-string">${str}</span>`
      if (bool !== undefined) return `<span class="jh-bool">${bool}</span>`
      if (num  !== undefined) return `<span class="jh-num">${num}</span>`
      if (punct !== undefined) return `<span class="jh-punct">${punct}</span>`
      return _
    }
  )
}

export function JsonTab({ carousel, onLoadCarousel }) {
  const [editorValue, setEditorValue] = useState(() => serializeCarousel(carousel))
  const [errors, setErrors] = useState([])
  const [isDirty, setIsDirty] = useState(false)
  const textareaRef = useRef(null)
  const preRef = useRef(null)

  // Aggiorna l'editor quando il carousel cambia dall'esterno
  // (modifica slide, undo/redo, import) ma solo se non ci sono modifiche locali
  useEffect(() => {
    if (!isDirty) {
      setEditorValue(serializeCarousel(carousel))
      setErrors([])
    }
  }, [carousel, isDirty])

  const handleChange = useCallback((e) => {
    setEditorValue(e.target.value)
    setIsDirty(true)
    setErrors([])
  }, [])

  // Mantiene textarea e pre allineati durante lo scroll
  function handleScroll(e) {
    if (preRef.current) {
      preRef.current.scrollTop  = e.target.scrollTop
      preRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  function handleApply() {
    try {
      const raw = JSON.parse(editorValue)
      const result = validateJson(raw)
      if (result.ok) {
        onLoadCarousel(result.data)
        setErrors([])
        setIsDirty(false)
        toast('Modifiche JSON applicate', 'success')
      } else {
        setErrors(result.errors)
      }
    } catch (e) {
      setErrors([{ path: '(root)', message: `JSON non valido: ${e.message}` }])
    }
  }

  function handleDiscard() {
    setEditorValue(serializeCarousel(carousel))
    setErrors([])
    setIsDirty(false)
  }

  function handleExport() {
    const blob = new Blob([editorValue], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugifyTitle(carousel.title)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('JSON esportato', 'success')
  }

  return (
    <div className="json-tab">
      <div className="json-tab__toolbar">
        <Button variant="primary" size="sm" onClick={handleApply} disabled={!isDirty}>
          Applica modifiche
        </Button>
        {isDirty && (
          <Button variant="ghost" size="sm" onClick={handleDiscard} title="Scarta le modifiche nell'editor">
            <RotateCcw size={13} />
            Scarta
          </Button>
        )}
        <div className="json-tab__toolbar-spacer" />
        {isDirty && (
          <span className="json-tab__dirty-badge">● modifiche non applicate</span>
        )}
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={13} />
          Esporta JSON
        </Button>
      </div>

      <div className="json-tab__editor">
        {/* Layer statico con i colori — non interattivo */}
        <pre
          ref={preRef}
          className="json-tab__highlight"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlightJson(editorValue) }}
        />
        {/* Textarea trasparente sopra: riceve input, mostra solo il cursore */}
        <textarea
          ref={textareaRef}
          className="json-tab__textarea"
          value={editorValue}
          onChange={handleChange}
          onScroll={handleScroll}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {errors.length > 0 && (
        <div className="json-tab__errors">
          {errors.map((err, i) => (
            <div key={i} className="json-tab__error-item">
              <span className="json-tab__error-path">{err.path}:</span>
              <span>{err.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
