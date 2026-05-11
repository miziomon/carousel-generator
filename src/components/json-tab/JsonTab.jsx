import { useState, useEffect, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { Download, RotateCcw } from 'lucide-react'
import { validateJson } from '../../lib/validateJson.js'
import { Button } from '../ui/Button.jsx'
import { toast } from '../ui/Toast.jsx'
import './json-tab.css'

// Tema CodeMirror minimale coerente con la palette dell'app
const CM_THEME = {
  '&': { background: '#0a0e1a', color: '#e8e8e8', height: '100%' },
  '.cm-content': { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', padding: '16px 0' },
  '.cm-gutters': { background: '#0d1224', borderRight: '1px solid rgba(232,232,232,0.08)', color: 'rgba(232,232,232,0.2)' },
  '.cm-activeLine': { background: 'rgba(0,255,170,0.03)' },
  '.cm-cursor': { borderLeftColor: '#00ffaa' },
  '.cm-selectionBackground, ::selection': { background: 'rgba(0,255,170,0.15) !important' },
}

function serializeCarousel(carousel) {
  return JSON.stringify(
    { ...carousel, slides: carousel.slides.map(({ id: _id, ...rest }) => rest) },
    null,
    2
  )
}

export function JsonTab({ carousel, onLoadCarousel }) {
  const [editorValue, setEditorValue] = useState(() => serializeCarousel(carousel))
  const [errors, setErrors] = useState([])
  const [isDirty, setIsDirty] = useState(false)

  // Sincronizza l'editor quando il carousel cambia dall'esterno (undo/redo, import)
  // ma solo se l'editor non ha modifiche non applicate
  useEffect(() => {
    if (!isDirty) {
      setEditorValue(serializeCarousel(carousel))
      setErrors([])
    }
  }, [carousel, isDirty])

  const handleEditorChange = useCallback((value) => {
    setEditorValue(value)
    setIsDirty(true)
    setErrors([])
  }, [])

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
    a.download = 'carosello.json'
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
          <Button variant="ghost" size="sm" onClick={handleDiscard} title="Annulla le modifiche nell'editor">
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
        <CodeMirror
          value={editorValue}
          extensions={[json()]}
          theme={CM_THEME}
          onChange={handleEditorChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            bracketMatching: true,
            autocompletion: true,
            indentOnInput: true,
          }}
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
