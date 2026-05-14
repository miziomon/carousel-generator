import { useMemo } from 'react'
import { Palette } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { PaletteSelector } from '../../theme-tab/PaletteSelector.jsx'
import { PaletteStatusBadge } from '../../theme-tab/PaletteStatusBadge.jsx'
import { ColorPicker } from '../../theme-tab/ColorPicker.jsx'
import { ContrastChecker } from '../../theme-tab/ContrastChecker.jsx'
import { Button } from '../../ui/Button.jsx'
import { toast } from '../../ui/Toast.jsx'
import { useDebouncedCallback } from '../../../hooks/useDebouncedCallback.js'
import { colorsEqual } from '../../../lib/palettes/colorUtils.js'

function computePaletteStatus(theme, paletteLibrary) {
  if (!theme.palette_id) return 'custom'
  const ref = paletteLibrary.find((p) => p.id === theme.palette_id)
  if (!ref) return 'custom'
  const keys = ['background', 'surface', 'foreground', 'accent', 'muted', 'line']
  const allMatch = keys.every((k) => colorsEqual(theme.palette[k], ref.colors[k]))
  return allMatch ? 'in-sync' : 'modificata'
}

const COLOR_FIELDS = [
  { key: 'background', label: 'Sfondo' },
  { key: 'surface',    label: 'Superficie' },
  { key: 'foreground', label: 'Testo' },
  { key: 'accent',     label: 'Accento' },
  { key: 'muted',      label: 'Spento' },
  { key: 'line',       label: 'Linea' },
]

export function PaletteSection({ isOpen, onToggle, theme, paletteLibrary, applyPalette, resyncPalette, updatePaletteInline, openPaletteManager }) {
  const paletteStatus = useMemo(
    () => computePaletteStatus(theme, paletteLibrary),
    [theme, paletteLibrary]
  )
  const canResync = paletteStatus === 'modificata'

  // Debounce 80ms — HexColorPicker ha stato interno per la fluidità visiva durante il drag
  const debouncedUpdate = useDebouncedCallback(
    (key, value) => updatePaletteInline(key, value),
    80
  )

  function handleResync() {
    resyncPalette()
    toast('Palette ri-sincronizzata')
  }

  return (
    <ThemeSection id="palette" title="Palette" icon={Palette} isOpen={isOpen} onToggle={onToggle}>
      <PaletteSelector
        paletteLibrary={paletteLibrary}
        currentId={theme.palette_id}
        onSelect={applyPalette}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PaletteStatusBadge status={paletteStatus} />
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <Button
            size="xs"
            variant="ghost"
            disabled={!canResync}
            onClick={handleResync}
            title={canResync ? 'Ripristina i colori dalla palette di riferimento' : "La palette è già in sync"}
          >
            Ri-sincronizza
          </Button>
          <Button size="xs" variant="ghost" onClick={openPaletteManager}>
            Gestisci...
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {COLOR_FIELDS.map(({ key, label }) => (
          <ColorPicker
            key={key}
            label={label}
            value={theme.palette[key] ?? ''}
            onChange={(v) => debouncedUpdate(key, v)}
          />
        ))}
      </div>

      <ContrastChecker palette={theme.palette} />
    </ThemeSection>
  )
}
