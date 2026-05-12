import { useState, useCallback, useMemo } from 'react'
import { ColorPicker } from './ColorPicker.jsx'
import { PaletteSelector } from './PaletteSelector.jsx'
import { PaletteStatusBadge } from './PaletteStatusBadge.jsx'
import { ContrastChecker } from './ContrastChecker.jsx'
import { FieldGroup, TextInput, Toggle } from '../edit-modal/FieldGroup.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { Button } from '../ui/Button.jsx'
import { toast } from '../ui/Toast.jsx'
import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'
import { defaultCarousel } from '../../lib/defaultCarousel.js'
import { colorsEqual } from '../../lib/palettes/colorUtils.js'
import './theme-tab.css'

// Slide di esempio per l'anteprima del tema -- fissa, non modificabile
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
const PREVIEW_SIZE  = Math.round(1080 * PREVIEW_SCALE)

/**
 * Calcola lo status della palette corrente rispetto alla palette di riferimento.
 *
 * - 'in-sync'    -> i 6 colori sono identici alla palette referenziata
 * - 'modificata' -> palette_id presente ma colori divergiti
 * - 'custom'     -> palette_id e' null o la palette e' stata eliminata dalla libreria
 */
function computePaletteStatus(theme, paletteLibrary) {
  if (!theme.palette_id) return 'custom'
  const ref = paletteLibrary.find((p) => p.id === theme.palette_id)
  if (!ref) return 'custom'
  const keys = ['background', 'surface', 'foreground', 'accent', 'muted', 'line']
  const allMatch = keys.every((k) => colorsEqual(theme.palette[k], ref.colors[k]))
  return allMatch ? 'in-sync' : 'modificata'
}

export function ThemeTab({
  theme,
  onChange,
  paletteLibrary,
  applyPalette,
  resyncPalette,
  updatePaletteInline,
  openPaletteManager,
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const setNested = useCallback(
    (section, key, value) => {
      onChange({ ...theme, [section]: { ...theme[section], [key]: value } })
    },
    [theme, onChange]
  )

  function handleReset() {
    onChange(defaultCarousel.theme)
    setShowResetConfirm(false)
  }

  const paletteStatus = useMemo(
    () => computePaletteStatus(theme, paletteLibrary),
    [theme, paletteLibrary]
  )

  const canResync = paletteStatus === 'modificata'

  /**
   * Wrapper di resyncPalette che emette un toast di conferma.
   * Separato per non inquinare il JSX con logica extra inline.
   */
  function handleResync() {
    resyncPalette()
    toast('Palette ri-sincronizzata')
  }

  return (
    <div className="theme-tab">
      <div className="theme-tab__form">

        <section className="theme-tab__section">
          <h3 className="theme-tab__section-title">Palette colori</h3>

          <div className="theme-tab__palette-header">
            <PaletteSelector
              paletteLibrary={paletteLibrary}
              currentId={theme.palette_id}
              onSelect={applyPalette}
            />
            <div className="theme-tab__palette-meta">
              <PaletteStatusBadge status={paletteStatus} />
              <div className="theme-tab__palette-actions">
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={!canResync}
                  onClick={handleResync}
                  title={canResync ? 'Ripristina i colori dalla palette di riferimento' : "La palette e' gia' in sync"}
                >
                  Ri-sincronizza
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={openPaletteManager}
                >
                  Gestisci palette...
                </Button>
              </div>
            </div>
          </div>

          <div className="theme-tab__palette-colors">
            <ColorPicker
              label="Sfondo"
              value={theme.palette.background}
              onChange={(v) => updatePaletteInline('background', v)}
            />
            <ColorPicker
              label="Superficie"
              value={theme.palette.surface !== undefined ? theme.palette.surface : ''}
              onChange={(v) => updatePaletteInline('surface', v)}
            />
            <ColorPicker
              label="Testo"
              value={theme.palette.foreground}
              onChange={(v) => updatePaletteInline('foreground', v)}
            />
            <ColorPicker
              label="Accento"
              value={theme.palette.accent}
              onChange={(v) => updatePaletteInline('accent', v)}
            />
            <ColorPicker
              label="Spento"
              value={theme.palette.muted}
              onChange={(v) => updatePaletteInline('muted', v)}
            />
            <ColorPicker
              label="Linea"
              value={theme.palette.line}
              onChange={(v) => updatePaletteInline('line', v)}
            />
          </div>

          <ContrastChecker palette={theme.palette} />
        </section>

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

        <section className="theme-tab__section">
          <h3 className="theme-tab__section-title">Font</h3>
          <FieldGroup label="Font principale (titoli)">
            <TextInput
              value={theme.fonts.primary}
              onChange={(v) => setNested('fonts', 'primary', v)}
            />
          </FieldGroup>
          <FieldGroup label="Font secondario (corpo)">
            <TextInput
              value={theme.fonts.secondary}
              onChange={(v) => setNested('fonts', 'secondary', v)}
            />
          </FieldGroup>
          <FieldGroup label="Font monospace (UI slide)">
            <TextInput
              value={theme.fonts.mono}
              onChange={(v) => setNested('fonts', 'mono', v)}
            />
          </FieldGroup>
        </section>

        <div className="pt-2">
          <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
            Reset al tema di default
          </Button>
        </div>
      </div>

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
          <div
            style={{
              transform: 'scale(' + PREVIEW_SCALE + ')',
              transformOrigin: 'top left',
              width: 1080,
              height: 1080,
            }}
          >
            <SlideRenderer slide={PREVIEW_SLIDE} theme={theme} total={1} mode="preview" />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset tema"
        message="Vuoi ripristinare tutti i valori del tema alle impostazioni di default?"
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  )
}
