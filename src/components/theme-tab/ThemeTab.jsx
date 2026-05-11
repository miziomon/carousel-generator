import { useState, useCallback } from 'react'
import { ColorPicker } from './ColorPicker.jsx'
import { FieldGroup, TextInput, Toggle } from '../edit-modal/FieldGroup.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { Button } from '../ui/Button.jsx'
import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'
import { defaultCarousel } from '../../lib/defaultCarousel.js'
import './theme-tab.css'

// Slide di esempio per l'anteprima del tema: usa la prima slide standard
const PREVIEW_SLIDE = {
  id: '__theme-preview__',
  num: 1,
  type: 'standard',
  font: 'archivo',
  size: 'lg',
  kicker: null,
  lines: ['Anteprima [hl]tema[/hl]', '', 'Testo di esempio'],
}

const PREVIEW_SCALE = 0.33
const PREVIEW_SIZE = Math.round(1080 * PREVIEW_SCALE) // ~356px

export function ThemeTab({ theme, onChange }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const setNested = useCallback((section, key, value) => {
    onChange({ ...theme, [section]: { ...theme[section], [key]: value } })
  }, [theme, onChange])

  function handlePaletteChange(key, value) {
    onChange({ ...theme, palette: { ...theme.palette, [key]: value } })
  }

  function handleReset() {
    onChange(defaultCarousel.theme)
    setShowResetConfirm(false)
  }

  return (
    <div className="theme-tab">
      <div className="theme-tab__form">

        {/* ── PALETTE ── */}
        <section className="theme-tab__section">
          <h3 className="theme-tab__section-title">Palette colori</h3>
          <ColorPicker label="Sfondo"    value={theme.palette.background} onChange={(v) => handlePaletteChange('background', v)} />
          <ColorPicker label="Testo"     value={theme.palette.foreground} onChange={(v) => handlePaletteChange('foreground', v)} />
          <ColorPicker label="Accento"   value={theme.palette.accent}     onChange={(v) => handlePaletteChange('accent', v)} />
          <ColorPicker label="Attenuato" value={theme.palette.muted}      onChange={(v) => handlePaletteChange('muted', v)} />
          <ColorPicker label="Linee"     value={theme.palette.line}       onChange={(v) => handlePaletteChange('line', v)} />
        </section>

        {/* ── HEADER ── */}
        <section className="theme-tab__section">
          <h3 className="theme-tab__section-title">Header slide</h3>
          <FieldGroup label="Kicker default" help="Testo mostrato in tutte le slide che non hanno un kicker personalizzato">
            <TextInput
              value={theme.header.kicker_default}
              onChange={(v) => setNested('header', 'kicker_default', v)}
            />
          </FieldGroup>
          <Toggle
            checked={theme.header.show_topline}
            onChange={(v) => setNested('header', 'show_topline', v)}
            label="Mostra linea in cima"
          />
          <Toggle
            checked={theme.header.show_dot}
            onChange={(v) => setNested('header', 'show_dot', v)}
            label="Mostra punto accento (in alto a destra)"
          />
        </section>

        {/* ── FOOTER ── */}
        <section className="theme-tab__section">
          <h3 className="theme-tab__section-title">Footer slide</h3>
          <FieldGroup label="Nome autore">
            <TextInput
              value={theme.footer.name}
              onChange={(v) => setNested('footer', 'name', v)}
            />
          </FieldGroup>
          <Toggle
            checked={theme.footer.show_separator_line}
            onChange={(v) => setNested('footer', 'show_separator_line', v)}
            label="Mostra linea separatrice"
          />
          <Toggle
            checked={theme.footer.show_meta_number}
            onChange={(v) => setNested('footer', 'show_meta_number', v)}
            label="Mostra numerazione (es. 03 / 12)"
          />
        </section>

        {/* ── FONT ── */}
        <section className="theme-tab__section">
          <h3 className="theme-tab__section-title">Font</h3>
          <FieldGroup label="Font principale (titoli)">
            <TextInput value={theme.fonts.primary}   onChange={(v) => setNested('fonts', 'primary', v)}   />
          </FieldGroup>
          <FieldGroup label="Font secondario (corpo)">
            <TextInput value={theme.fonts.secondary} onChange={(v) => setNested('fonts', 'secondary', v)} />
          </FieldGroup>
          <FieldGroup label="Font monospace (UI slide)">
            <TextInput value={theme.fonts.mono}      onChange={(v) => setNested('fonts', 'mono', v)}      />
          </FieldGroup>
        </section>

        {/* Reset */}
        <div className="pt-2">
          <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
            Reset al tema di default
          </Button>
        </div>
      </div>

      {/* ── ANTEPRIMA ── */}
      <div className="theme-tab__preview">
        <span className="theme-tab__preview-label">Anteprima live</span>
        <div
          style={{
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            overflow: 'hidden',
            borderRadius: 6,
            border: '1px solid rgba(232,232,232,0.1)',
          }}
        >
          <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', width: 1080, height: 1080 }}>
            <SlideRenderer slide={PREVIEW_SLIDE} theme={theme} total={1} mode="preview" />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset tema"
        message="Vuoi ripristinare tutti i valori del tema alle impostazioni di default? Le modifiche alla palette e alle impostazioni verranno perse."
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  )
}
