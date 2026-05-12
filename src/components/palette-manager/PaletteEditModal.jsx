import { useState, useEffect, useCallback } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { ColorPicker } from '../theme-tab/ColorPicker.jsx'
import { ContrastChecker } from '../theme-tab/ContrastChecker.jsx'
import { PalettePreview } from './PalettePreview.jsx'
import { PaletteColorsSchema } from '../../lib/schema.js'

/**
 * Colori di default per una nuova palette (stessa base di Tech Dark).
 */
const DEFAULT_COLORS = {
  background: '#0a0e1a',
  surface:    '#1a1e2a',
  foreground: '#e8e8e8',
  accent:     '#00ffaa',
  muted:      'rgba(232,232,232,0.45)',
  line:       'rgba(232,232,232,0.18)',
}

/**
 * Definizione dei 6 slot colore con label e testo di aiuto.
 */
const COLOR_FIELDS = [
  { key: 'background', label: 'Sfondo',     help: 'Colore di sfondo principale' },
  { key: 'surface',    label: 'Superficie', help: 'Sfondo per blocchi hl-soft' },
  { key: 'foreground', label: 'Testo',      help: 'Colore principale del testo' },
  { key: 'accent',     label: 'Accento',    help: 'Dot, kicker, highlight forti' },
  { key: 'muted',      label: 'Spento',     help: 'Testo secondario, numerazione' },
  { key: 'line',       label: 'Linea',      help: 'Separatori e bordi' },
]

/**
 * Modal per creare, modificare o duplicare una palette utente.
 *
 * Modalita':
 *   mode = 'create'    -> form vuoto (colori di default)
 *   mode = 'edit'      -> form precompilato, salva con UPDATE_PALETTE
 *   mode = 'duplicate' -> form precompilato con nome suggerito, salva con CREATE_PALETTE
 *
 * Hotkeys:
 *   Cmd/Ctrl+Enter -> salva il form (equivalente al click su "Salva")
 *
 * @param {boolean}  open        — se il modal e' aperto
 * @param {string}   mode        — 'create' | 'edit' | 'duplicate'
 * @param {object}   initialData — palette di partenza (per edit/duplicate)
 * @param {Function} onSave      — callback(formData) — il genitore chiama l'azione giusta
 * @param {Function} onClose     — chiude il modal
 */
export function PaletteEditModal({ open, mode, initialData, onSave, onClose }) {
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [colors, setColors]       = useState({ ...DEFAULT_COLORS })
  const [nameError, setNameError] = useState('')

  // Precompila (o azzera) il form ogni volta che il modal si apre o cambia modalita'
  useEffect(() => {
    if (!open) return
    if (mode === 'create') {
      setName('')
      setDesc('')
      setColors({ ...DEFAULT_COLORS })
    } else if (initialData) {
      // In duplicate, suggerisce un nuovo nome per evitare collisioni
      setName(mode === 'duplicate' ? initialData.name + ' (copia)' : initialData.name)
      setDesc(initialData.description ?? '')
      setColors({ ...initialData.colors })
    }
    setNameError('')
  }, [open, mode, initialData])

  /**
   * Aggiorna un singolo slot colore mantenendo gli altri invariati.
   *
   * @param {string} key   — chiave dello slot (es. 'accent')
   * @param {string} value — nuovo valore colore
   */
  function handleColorChange(key, value) {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * Valida il form e invoca onSave se tutto e' ok.
   * useCallback garantisce una referenza stabile per l'effect Cmd+Enter.
   */
  const handleSave = useCallback(() => {
    const trimmedName = name.trim()

    // Validazione nome
    if (!trimmedName) {
      setNameError('Il nome e\' obbligatorio.')
      return
    }
    if (trimmedName.length > 40) {
      setNameError('Il nome non puo\' superare 40 caratteri.')
      return
    }

    // Validazione struttura colori con PaletteColorsSchema
    const colorsResult = PaletteColorsSchema.safeParse(colors)
    if (!colorsResult.success) {
      setNameError('Uno o piu\' colori non sono validi.')
      return
    }

    onSave({ name: trimmedName, description: description.trim(), colors })
  }, [name, description, colors, onSave])

  /**
   * Shortcut Cmd/Ctrl+Enter per salvare il form senza usare il mouse.
   * Si aggancia solo quando il modal e' aperto.
   */
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, handleSave])

  // Titolo dinamico in base alla modalita'
  const title =
    mode === 'create'    ? 'Nuova palette'     :
    mode === 'duplicate' ? 'Duplica palette'   :
                           'Modifica palette'

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="palette-edit-modal">
        {/* -- Form sinistra -- */}
        <div className="palette-edit-modal__form">

          {/* Campo nome */}
          <div className="palette-edit-modal__field">
            <label className="palette-edit-modal__label">Nome *</label>
            <input
              type="text"
              className={'palette-edit-modal__input' + (nameError ? ' palette-edit-modal__input--error' : '')}
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              maxLength={40}
              placeholder="es. Brand 2025"
              autoFocus
            />
            {nameError && <span className="palette-edit-modal__error">{nameError}</span>}
          </div>

          {/* Campo descrizione */}
          <div className="palette-edit-modal__field">
            <label className="palette-edit-modal__label">Descrizione (opzionale)</label>
            <textarea
              className="palette-edit-modal__textarea"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Breve descrizione della palette…"
            />
          </div>

          {/* Griglia dei 6 ColorPicker */}
          <div className="palette-edit-modal__colors-grid">
            {COLOR_FIELDS.map(({ key, label }) => (
              <ColorPicker
                key={key}
                label={label}
                value={colors[key] ?? ''}
                onChange={(v) => handleColorChange(key, v)}
              />
            ))}
          </div>

          {/* Verifica contrasto WCAG live */}
          <ContrastChecker palette={colors} />

          {/* Footer azioni */}
          <div className="palette-edit-modal__footer">
            <Button variant="ghost" onClick={onClose}>Annulla</Button>
            <Button variant="primary" onClick={handleSave}>Salva</Button>
          </div>
        </div>

        {/* -- Anteprima live destra -- */}
        <div className="palette-edit-modal__preview">
          <PalettePreview colors={colors} />
        </div>
      </div>
    </Modal>
  )
}
