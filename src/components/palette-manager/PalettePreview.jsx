import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'

/**
 * Slide di esempio usata nell'anteprima del PaletteEditModal.
 * Contiene tutti i tipi di markup inline supportati per mostrare
 * il massimo range cromatico della palette.
 */
const PREVIEW_SLIDE = {
  id: '__palette-preview__',
  num: 1,
  type: 'standard',
  font: 'archivo',
  size: 'lg',
  kicker: 'Anteprima',
  lines: [
    'Titolo [hl]principale[/hl]',
    '',
    '[soft]Testo in evidenza soft[/soft]',
    'Testo normale con [c]colore[/c]',
  ],
}

const PREVIEW_SIZE  = 280
const PREVIEW_SCALE = PREVIEW_SIZE / 1080

/**
 * Costruisce un tema minimale a partire dai soli colori della palette.
 * Le altre proprietà del tema usano valori di default neutri.
 *
 * @param {object} colors — 6 slot colore della palette
 * @returns {object} tema compatibile con SlideRenderer
 */
function makePreviewTheme(colors) {
  return {
    palette_id: null,
    palette: colors,
    header: { kicker_default: 'Anteprima', show_topline: true, show_dot: true },
    footer: { name: 'Palette preview', show_separator_line: true, show_meta_number: false },
    fonts:  { primary: 'Archivo Black', secondary: 'Fraunces', mono: 'JetBrains Mono' },
  }
}

/**
 * Anteprima live di una palette su una slide di esempio 280×280.
 * Usato nel PaletteEditModal per vedere l'effetto dei colori in tempo reale.
 *
 * @param {object} colors — 6 slot colore della palette
 */
export function PalettePreview({ colors }) {
  const theme = makePreviewTheme(colors)

  return (
    <div className="palette-preview">
      <span className="palette-preview__label">Anteprima live</span>
      <div className="palette-preview__frame">
        {/* La slide è nativa 1080×1080 — scale la porta a 280×280 */}
        <div
          style={{
            transform: `scale(${PREVIEW_SCALE})`,
            transformOrigin: 'top left',
            width: 1080,
            height: 1080,
          }}
        >
          <SlideRenderer slide={PREVIEW_SLIDE} theme={theme} total={1} mode="preview" />
        </div>
      </div>
    </div>
  )
}
