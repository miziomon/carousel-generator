import { useCallback, useRef } from 'react'
import { PanelBottom } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { FieldGroup, TextInput, Toggle, SelectInput } from '../../edit-modal/FieldGroup.jsx'
import './footer-section.css'

const SWIPE_SCOPE_OPTIONS = [
  { value: 'cover',        label: 'Solo cover' },
  { value: 'all-but-last', label: 'Tutte tranne l\'ultima' },
  { value: 'all',          label: 'Tutte le slide' },
]

export function FooterSection({ isOpen, onToggle, theme, onChange }) {
  const timerY  = useRef(null)
  const timerFs = useRef(null)

  const setNested = useCallback(
    (key, value) => onChange({ ...theme, footer: { ...theme.footer, [key]: value } }),
    [theme, onChange]
  )

  const setSwipe = useCallback(
    (key, value) =>
      onChange({
        ...theme,
        footer: {
          ...theme.footer,
          swipe: { ...theme.footer.swipe, [key]: value },
        },
      }),
    [theme, onChange]
  )

  const swipe = theme.footer.swipe ?? { enabled: false, scope: 'cover', position_y: 130, font_size: 14 }

  function handlePositionY(e) {
    const v = Number(e.target.value)
    clearTimeout(timerY.current)
    timerY.current = setTimeout(() => setSwipe('position_y', v), 150)
  }

  function handlePositionYInput(e) {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v)) {
      clearTimeout(timerY.current)
      timerY.current = setTimeout(() => setSwipe('position_y', Math.min(400, Math.max(0, v))), 150)
    }
  }

  function handleFontSize(e) {
    const v = Number(e.target.value)
    clearTimeout(timerFs.current)
    timerFs.current = setTimeout(() => setSwipe('font_size', v), 150)
  }

  function handleFontSizeInput(e) {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v)) {
      clearTimeout(timerFs.current)
      timerFs.current = setTimeout(() => setSwipe('font_size', Math.min(48, Math.max(8, v))), 150)
    }
  }

  return (
    <ThemeSection id="footer" title="Footer" icon={PanelBottom} isOpen={isOpen} onToggle={onToggle}>
      <FieldGroup label="Nome autore">
        <TextInput
          value={theme.footer.name}
          onChange={(v) => setNested('name', v)}
        />
      </FieldGroup>
      <Toggle
        checked={theme.footer.show_separator_line}
        onChange={(v) => setNested('show_separator_line', v)}
        label="Mostra linea separatrice"
      />
      <Toggle
        checked={theme.footer.show_meta_number}
        onChange={(v) => setNested('show_meta_number', v)}
        label="Mostra numerazione (es. 03 / 12)"
      />

      <div className="footer-section__divider" />

      <Toggle
        checked={swipe.enabled}
        onChange={(v) => setSwipe('enabled', v)}
        label="Mostra freccia scorri"
      />

      {swipe.enabled && (
        <>
          <FieldGroup label="Mostra su">
            <SelectInput
              value={swipe.scope}
              onChange={(v) => setSwipe('scope', v)}
              options={SWIPE_SCOPE_OPTIONS}
            />
          </FieldGroup>

          <FieldGroup label="Posizione Y (px da fondo)">
            <div className="footer-section__slider-row">
              <input
                type="range"
                min={0}
                max={400}
                step={1}
                defaultValue={swipe.position_y}
                onChange={handlePositionY}
                className="footer-section__range"
              />
              <input
                type="number"
                min={0}
                max={400}
                defaultValue={swipe.position_y}
                onChange={handlePositionYInput}
                className="footer-section__num"
              />
              <span className="footer-section__unit">px</span>
            </div>
          </FieldGroup>

          <FieldGroup label="Dimensione font freccia">
            <div className="footer-section__slider-row">
              <input
                type="range"
                min={8}
                max={48}
                step={1}
                defaultValue={swipe.font_size}
                onChange={handleFontSize}
                className="footer-section__range"
              />
              <input
                type="number"
                min={8}
                max={48}
                defaultValue={swipe.font_size}
                onChange={handleFontSizeInput}
                className="footer-section__num"
              />
              <span className="footer-section__unit">px</span>
            </div>
          </FieldGroup>
        </>
      )}
    </ThemeSection>
  )
}
