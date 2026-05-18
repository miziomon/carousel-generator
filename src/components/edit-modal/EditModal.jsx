import { useState, useEffect, useCallback } from 'react'
import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'
import { FieldGroup, TextInput, SelectInput, RadioGroup, Toggle } from './FieldGroup.jsx'
import { LinesEditor } from './LinesEditor.jsx'
import { CtaItemsEditor } from './CtaItemsEditor.jsx'
import { BackgroundImageSection } from './BackgroundImageSection.jsx'
import { TypographyPanel } from './TypographyPanel.jsx'
import { Button } from '../ui/Button.jsx'
import { getFormat } from '../../lib/formats/registry.js'
import './edit-modal.css'
import './background-image-section.css'
import './typography-panel.css'

// Larghezza fissa dell'anteprima (px). L'altezza varia con il formato.
const PREVIEW_W_PX = 389

const TYPE_OPTIONS = [
  { value: 'cover',    label: 'Cover' },
  { value: 'standard', label: 'Standard' },
  { value: 'divider',  label: 'Divisore' },
  { value: 'quote',    label: 'Citazione' },
  { value: 'cta',      label: 'Call to action' },
  { value: 'blank',    label: 'Blank (solo immagine)' },
]

const SIZE_OPTIONS_STANDARD = [
  { value: 'xl', label: 'XL (96px)' },
  { value: 'lg', label: 'LG (82px)' },
  { value: 'md', label: 'MD (68px)' },
]

const CAPTION_POSITION_OPTIONS = [
  { value: 'top',    label: 'In alto' },
  { value: 'center', label: 'Al centro' },
  { value: 'bottom', label: 'In basso' },
]

// ─── Logica cambio tipo ───────────────────────────────────────────────────────

function migrateToType(current, newType) {
  let note = current._note_autore || ''
  let updated = { ...current, type: newType }

  if (newType === 'cover') {
    updated.size = 'cover'
    if (current.type === 'cta') {
      if (current.cta_items?.length) {
        note = `[cta backup] ${current.cta_items.join(' | ')}\n${note}`
      }
      updated.lines = ['Titolo cover']
      delete updated.cta_items
    } else if (current.type === 'blank') {
      updated.lines = [current.caption || 'Titolo cover']
      delete updated.caption
      delete updated.caption_position
    } else {
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
    } else if (current.type === 'blank') {
      updated.lines = [current.caption || '']
      delete updated.caption
      delete updated.caption_position
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
    } else if (current.type === 'blank') {
      updated.lines = [current.caption || 'Titolo sezione']
      delete updated.caption
      delete updated.caption_position
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
    } else if (current.type === 'blank') {
      updated.lines = [current.caption || 'La tua citazione qui.']
      delete updated.caption
      delete updated.caption_position
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
    if (current.type === 'blank') {
      delete updated.caption
      delete updated.caption_position
    } else if (current.lines?.join('').trim()) {
      note = `[lines backup] ${current.lines.join(' | ')}\n${note}`
    }
    updated.cta_items = current.cta_items?.length ? current.cta_items : ['→ Link in bio']
    delete updated.lines
    delete updated.divider_number
    delete updated.divider_label
    delete updated.size
    delete updated.author
    delete updated.source
  } else if (newType === 'blank') {
    // Sposta il testo in caption (prima riga o item CTA)
    if (current.type === 'cta') {
      if (current.cta_items?.length) note = `[cta backup] ${current.cta_items.join(' | ')}\n${note}`
      updated.caption = null
    } else if (current.lines?.length) {
      note = `[lines backup] ${current.lines.join(' | ')}\n${note}`
      updated.caption = null
    } else {
      updated.caption = null
    }
    updated.caption_position = 'center'
    delete updated.lines
    delete updated.cta_items
    delete updated.divider_number
    delete updated.divider_label
    delete updated.size
    delete updated.show_swipe_arrow
    delete updated.author
    delete updated.source
  }

  // Pulizia author/source quando il nuovo tipo non è quote
  if (newType !== 'quote') {
    delete updated.author
    delete updated.source
  }

  updated._note_autore = note.trim()
  return updated
}

// ─── Componente principale ────────────────────────────────────────────────────

export function EditModal({ slide, theme, total, carousel, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => ({ ...slide }))
  const [activeTab, setActiveTab] = useState('contenuto')

  // Calcola dimensioni anteprima in base al formato del carosello
  const format = getFormat(theme?.format)
  const previewScale = PREVIEW_W_PX / format.width
  const previewH = Math.round(format.height * previewScale)

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

  function handleBgImageChange(bgImage) {
    setDraft((prev) => {
      const next = { ...prev }
      if (bgImage === undefined) {
        delete next.background_image
      } else {
        next.background_image = bgImage
      }
      return next
    })
  }

  const isBlank   = draft.type === 'blank'
  const hasLines  = draft.type !== 'cta' && !isBlank
  const isCover   = draft.type === 'cover'
  const isDivider = draft.type === 'divider'
  const isCta     = draft.type === 'cta'
  const isQuote   = draft.type === 'quote'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      <div className="edit-modal__layout" style={{ flex: 1, minHeight: 0 }}>

        {/* ── FORM (sinistra 58%) ── */}
        <div className="edit-modal__form">

          {/* Tab bar */}
          <div className="edit-modal__tab-bar">
            <button
              type="button"
              className={`edit-modal__tab${activeTab === 'contenuto' ? ' edit-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('contenuto')}
            >
              Contenuto
            </button>
            <button
              type="button"
              className={`edit-modal__tab${activeTab === 'immagine' ? ' edit-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('immagine')}
            >
              Sfondo
            </button>
            <button
              type="button"
              className={`edit-modal__tab${activeTab === 'tipografia' ? ' edit-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('tipografia')}
            >
              Tipografia
            </button>
          </div>

          {/* ── TAB 1: Contenuto ── */}
          {activeTab === 'contenuto' && (
            <div className="edit-modal__tab-panel">

              {/* Tipo */}
              <FieldGroup label="Tipo">
                <SelectInput
                  value={draft.type}
                  onChange={handleTypeChange}
                  options={TYPE_OPTIONS}
                />
              </FieldGroup>

              {/* Kicker (non per blank) */}
              {!isBlank && (
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
              )}

              {/* Size (non per cta, cover, blank) */}
              {!isCta && !isCover && !isBlank && (
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

              {/* Campi blank: caption opzionale + posizione */}
              {isBlank && (
                <>
                  <FieldGroup label="Didascalia (opzionale)" help="Testo sovrapposto all'immagine. Lascia vuoto per slide solo-immagine.">
                    <div className="flex gap-2 items-center">
                      <Toggle
                        checked={draft.caption !== null && draft.caption !== undefined}
                        onChange={(v) => set('caption', v ? '' : null)}
                      />
                      {draft.caption !== null && draft.caption !== undefined && (
                        <TextInput
                          value={draft.caption}
                          onChange={(v) => set('caption', v || null)}
                          placeholder="es. Una frase potente"
                          className="flex-1"
                          maxLength={200}
                        />
                      )}
                    </div>
                  </FieldGroup>

                  {draft.caption !== null && draft.caption !== undefined && (
                    <FieldGroup label="Posizione didascalia">
                      <RadioGroup
                        name={`caption-pos-${draft.id}`}
                        value={draft.caption_position ?? 'center'}
                        onChange={(v) => set('caption_position', v)}
                        options={CAPTION_POSITION_OPTIONS}
                      />
                    </FieldGroup>
                  )}
                </>
              )}

              {/* Lines editor (non per cta, non per blank) */}
              {hasLines && (
                <FieldGroup label="Testo (righe)">
                  <LinesEditor
                    lines={draft.lines ?? ['']}
                    onChange={(lines) => {
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
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs text-slate-400 font-mono resize-y min-h-[3rem] focus:outline-none focus:border-slate-500 transition-colors"
                  placeholder="Appunti privati..."
                />
              </FieldGroup>
            </div>
          )}

          {/* ── TAB 3: Tipografia per-slide ── */}
          {activeTab === 'tipografia' && (
            <div className="edit-modal__tab-panel">
              <TypographyPanel draft={draft} theme={theme} set={set} />
            </div>
          )}

          {/* ── TAB 2: Sfondo immagine ── */}
          {activeTab === 'immagine' && (
            <div className="edit-modal__tab-panel">
              <BackgroundImageSection
                bgImage={draft.background_image}
                theme={theme}
                format={format}
                carousel={carousel}
                onChange={handleBgImageChange}
              />
            </div>
          )}
        </div>

        {/* ── ANTEPRIMA LIVE (destra 42%) — rispetta l'aspect ratio del formato ── */}
        <div className="edit-modal__preview">
          <span className="edit-modal__preview-label">Anteprima live</span>
          <div
            className="edit-modal__preview-wrap"
            style={{ width: PREVIEW_W_PX, height: previewH }}
          >
            <div style={{
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
              width: format.width,
              height: format.height,
            }}>
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
