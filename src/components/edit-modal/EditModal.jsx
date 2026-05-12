import { useState, useEffect, useCallback } from 'react'
import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'
import { FieldGroup, TextInput, SelectInput, RadioGroup, Toggle } from './FieldGroup.jsx'
import { LinesEditor } from './LinesEditor.jsx'
import { CtaItemsEditor } from './CtaItemsEditor.jsx'
import { Button } from '../ui/Button.jsx'
import './edit-modal.css'

// Dimensioni dell'anteprima live (slide 1080×1080 scalata)
const PREVIEW_SCALE = 0.38
const PREVIEW_SIZE = Math.round(1080 * PREVIEW_SCALE) // 410px

const TYPE_OPTIONS = [
  { value: 'cover',    label: 'Cover' },
  { value: 'standard', label: 'Standard' },
  { value: 'divider',  label: 'Divisore' },
  { value: 'quote',    label: 'Citazione' },
  { value: 'cta',      label: 'Call to action' },
]

const FONT_OPTIONS = [
  { value: 'archivo',  label: 'Archivo Black' },
  { value: 'fraunces', label: 'Fraunces' },
]

const SIZE_OPTIONS_STANDARD = [
  { value: 'xl', label: 'XL (96px)' },
  { value: 'lg', label: 'LG (82px)' },
  { value: 'md', label: 'MD (68px)' },
]

// ─── Logica cambio tipo ───────────────────────────────────────────────────────

function migrateToType(current, newType) {
  let note = current._note_autore || ''
  let updated = { ...current, type: newType }

  if (newType === 'cover') {
    updated.size = 'cover'
    if (current.type === 'cta') {
      // da cta: cta_items → backup, aggiungi lines vuoto
      if (current.cta_items?.length) {
        note = `[cta backup] ${current.cta_items.join(' | ')}\n${note}`
      }
      updated.lines = ['Titolo cover']
      delete updated.cta_items
    } else {
      // da standard/divider: tronca lines a 1
      const lines = current.lines ?? ['']
      if (lines.length > 1) {
        note = `[lines backup] ${lines.slice(1).join(' | ')}\n${note}`
      }
      updated.lines = [lines[0] || '']
    }
    delete updated.divider_number
    delete updated.divider_label
  } else if (newType === 'standard') {
    updated.size = current.size === 'cover' ? 'lg' : (current.size ?? 'lg')
    if (current.type === 'cta') {
      if (current.cta_items?.length) note = `[cta backup] ${current.cta_items.join(' | ')}\n${note}`
      updated.lines = ['']
      delete updated.cta_items
    } else {
      updated.lines = current.lines ?? ['']
    }
    delete updated.divider_number
    delete updated.divider_label
  } else if (newType === 'divider') {
    updated.size = current.size === 'cover' ? 'lg' : (current.size ?? 'lg')
    updated.divider_number = current.divider_number ?? '01'
    updated.divider_label = current.divider_label ?? null
    if (current.type === 'cta') {
      if (current.cta_items?.length) note = `[cta backup] ${current.cta_items.join(' | ')}\n${note}`
      updated.lines = ['Titolo sezione']
      delete updated.cta_items
    } else {
      const lines = current.lines ?? ['']
      if (lines.length > 2) {
        note = `[lines backup] ${lines.slice(2).join(' | ')}\n${note}`
        updated.lines = lines.slice(0, 2)
      }
    }
  } else if (newType === 'quote') {
    updated.size = current.size === 'cover' ? 'lg' : (current.size ?? 'lg')
    if (current.type === 'cta') {
      if (current.cta_items?.length) note = `[cta backup] ${current.cta_items.join(' | ')}\n${note}`
      updated.lines = ['La tua citazione qui.']
      delete updated.cta_items
    } else {
      updated.lines = current.lines ?? ['']
    }
    if (updated.author === undefined) updated.author = current.author ?? null
    if (updated.source === undefined) updated.source = current.source ?? null
    delete updated.divider_number
    delete updated.divider_label
    delete updated.show_swipe_arrow
  } else if (newType === 'cta') {
    updated.size = null
    if (current.lines?.join('').trim()) {
      note = `[lines backup] ${current.lines.join(' | ')}\n${note}`
    }
    updated.cta_items = current.cta_items?.length ? current.cta_items : ['→ Link in bio']
    delete updated.lines
    delete updated.divider_number
    delete updated.divider_label
    delete updated.size
    delete updated.author
    delete updated.source
  }

  // Pulizia author/source quando il nuovo tipo non e' quote
  if (newType !== 'quote') {
    delete updated.author
    delete updated.source
  }

  updated._note_autore = note.trim()
  return updated
}

// ─── Componente principale ────────────────────────────────────────────────────

export function EditModal({ slide, theme, total, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => ({ ...slide }))

  // Quando cambia la slide sorgente (apertura modale su slide diversa), risincronizza
  useEffect(() => {
    setDraft({ ...slide })
  }, [slide?.id])

  // Cmd/Ctrl+Enter = Salva
  useEffect(() => {
    function onKeyDown(e) {
      const isMac = navigator.platform.includes('Mac')
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onSave(draft)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [draft, onSave])

  const set = useCallback((field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }, [])

  function handleTypeChange(newType) {
    setDraft((prev) => migrateToType(prev, newType))
  }

  const hasLines = draft.type !== 'cta'
  const isCover = draft.type === 'cover'
  const isDivider = draft.type === 'divider'
  const isCta = draft.type === 'cta'
  const isQuote = draft.type === 'quote'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      <div className="edit-modal__layout" style={{ flex: 1, minHeight: 0 }}>

        {/* ── FORM (sinistra 58%) ── */}
        <div className="edit-modal__form">

          {/* Tipo */}
          <FieldGroup label="Tipo">
            <SelectInput
              value={draft.type}
              onChange={handleTypeChange}
              options={TYPE_OPTIONS}
            />
          </FieldGroup>

          {/* Kicker */}
          <FieldGroup label="Kicker" help="Testo sopra il titolo, in verde maiuscolo. Lascia vuoto per usare il default del tema.">
            <div className="flex gap-2 items-center">
              <Toggle
                checked={draft.kicker !== null && draft.kicker !== undefined}
                onChange={(v) => set('kicker', v ? '' : null)}
              />
              {draft.kicker !== null && draft.kicker !== undefined && (
                <TextInput
                  value={draft.kicker}
                  onChange={(v) => set('kicker', v)}
                  placeholder="es. Pensieri in pillole"
                  className="flex-1"
                />
              )}
            </div>
          </FieldGroup>

          {/* Font */}
          <FieldGroup label="Font">
            <RadioGroup
              name={`font-${draft.id}`}
              value={draft.font}
              onChange={(v) => set('font', v)}
              options={FONT_OPTIONS}
            />
          </FieldGroup>

          {/* Size (non per cta) */}
          {!isCta && !isCover && (
            <FieldGroup label="Dimensione testo">
              <RadioGroup
                name={`size-${draft.id}`}
                value={draft.size}
                onChange={(v) => set('size', v)}
                options={SIZE_OPTIONS_STANDARD}
              />
            </FieldGroup>
          )}

          {/* Campi cover */}
          {isCover && (
            <FieldGroup label="Freccia scorri">
              <Toggle
                checked={!!draft.show_swipe_arrow}
                onChange={(v) => set('show_swipe_arrow', v)}
                label='Mostra "SCORRI →"'
              />
            </FieldGroup>
          )}

          {/* Campi divider */}
          {isDivider && (
            <>
              <FieldGroup label="Numero sezione" help='Es. "01", "02"'>
                <TextInput
                  value={draft.divider_number ?? ''}
                  onChange={(v) => set('divider_number', v)}
                  placeholder="01"
                />
              </FieldGroup>
              <FieldGroup label="Etichetta sezione (opzionale)">
                <TextInput
                  value={draft.divider_label ?? ''}
                  onChange={(v) => set('divider_label', v || null)}
                  placeholder="es. Introduzione"
                />
              </FieldGroup>
            </>
          )}

          {/* Campi quote */}
          {isQuote && (
            <>
              <FieldGroup label="Autore (opzionale)" help="Verra' mostrato sotto la citazione preceduto da em-dash (—). Max 80 caratteri.">
                <TextInput
                  value={draft.author ?? ''}
                  onChange={(v) => set('author', v || null)}
                  placeholder="es. Audrey Hepburn"
                  maxLength={80}
                />
              </FieldGroup>
              <FieldGroup label="Fonte (opzionale)" help="Contesto della citazione (es. libro, intervista). Mostrata in corsivo. Max 120 caratteri.">
                <TextInput
                  value={draft.source ?? ''}
                  onChange={(v) => set('source', v || null)}
                  placeholder="es. da un'intervista, 1953"
                  maxLength={120}
                />
              </FieldGroup>
            </>
          )}

          {/* Lines editor (non per cta) */}
          {hasLines && (
            <FieldGroup label="Testo (righe)">
              <LinesEditor
                lines={draft.lines ?? ['']}
                onChange={(lines) => {
                  // Cover: forza max 1 riga
                  set('lines', isCover ? lines.slice(0, 1) : lines)
                }}
              />
              {isCover && (
                <p className="text-xs text-slate-500 mt-1">La cover accetta solo 1 riga.</p>
              )}
              {isDivider && (draft.lines?.length ?? 0) > 2 && (
                <p className="text-xs text-red-400 mt-1">Il divisore accetta al massimo 2 righe.</p>
              )}
            </FieldGroup>
          )}

          {/* CTA items */}
          {isCta && (
            <FieldGroup label="Item call to action">
              <CtaItemsEditor
                items={draft.cta_items ?? ['']}
                onChange={(items) => set('cta_items', items)}
              />
            </FieldGroup>
          )}

          {/* Note autore */}
          <FieldGroup label="Note autore (non visibili nella slide)">
            <textarea
              value={draft._note_autore ?? ''}
              onChange={(e) => set('_note_autore', e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs text-slate-400 font-mono resize-none focus:outline-none focus:border-slate-500 transition-colors"
              placeholder="Appunti privati..."
            />
          </FieldGroup>
        </div>

        {/* ── ANTEPRIMA LIVE (destra 42%) ── */}
        <div className="edit-modal__preview">
          <span className="edit-modal__preview-label">Anteprima live</span>
          <div
            className="edit-modal__preview-wrap"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          >
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', width: 1080, height: 1080 }}>
              <SlideRenderer slide={draft} theme={theme} total={total} mode="preview" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-600 text-center">
            Ctrl+Enter per salvare · Esc per annullare
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="edit-modal__footer">
        <Button variant="ghost" onClick={onCancel}>Annulla</Button>
        <Button variant="primary" onClick={() => onSave(draft)}>Salva</Button>
      </div>
    </div>
  )
}
