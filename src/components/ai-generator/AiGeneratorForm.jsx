import { useRef } from 'react'
import { AiNumberSlider } from './AiNumberSlider.jsx'
import { AiInfoBanner } from './AiInfoBanner.jsx'

const CHAR_MIN = 800
const CHAR_MAX = 3000

function CharCounter({ count }) {
  let color, label
  if (count < CHAR_MIN) {
    color = 'var(--color-muted, rgba(232,232,232,0.4))'
    label = ' (troppo breve)'
  } else if (count > CHAR_MAX) {
    color = '#ffbe00'
    label = ' (troppo lungo, considera di dividerlo)'
  } else {
    color = 'rgba(232,232,232,0.7)'
    label = ''
  }

  return (
    <span className="ai-form__char-counter" style={{ color }}>
      {count} caratteri{label}
      {count >= CHAR_MIN && count <= CHAR_MAX ? ' (consigliato: 800–3000)' : ''}
    </span>
  )
}

/**
 * Contenuto della tab "Genera": textarea post, slider, istruzioni extra, banner.
 */
export function AiGeneratorForm({
  postText,
  onPostTextChange,
  slideCount,
  onSlideCountChange,
  extraInstructions,
  onExtraChange,
  paletteCount,
}) {
  const textareaRef = useRef(null)
  const MAX_ROWS_HEIGHT = 20 * 24 // 20 righe * line-height ~24px

  function handlePostTextChange(e) {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, MAX_ROWS_HEIGHT) + 'px'
    onPostTextChange(e.target.value)
  }

  return (
    <div className="ai-form">
      {/* Campo 1: Testo del post */}
      <div className="ai-form__field">
        <label className="ai-form__label" htmlFor="ai-post-text">
          Testo del post
        </label>
        <p className="ai-form__help">
          Incolla qui il post LinkedIn, l&apos;articolo o la riflessione da trasformare in carosello
        </p>
        <textarea
          id="ai-post-text"
          ref={textareaRef}
          className="ai-form__textarea ai-form__textarea--large"
          rows={12}
          placeholder="Incolla qui il tuo testo..."
          value={postText}
          onChange={handlePostTextChange}
          onKeyDown={(e) => {
            // Cmd+Enter riservato alla futura integrazione — nessun comportamento per ora
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') e.preventDefault()
          }}
        />
        <div className="ai-form__char-row">
          <CharCounter count={postText.length} />
        </div>
      </div>

      {/* Campo 2: Numero di slide */}
      <div className="ai-form__field">
        <label className="ai-form__label">
          Numero di slide
        </label>
        <p className="ai-form__help">Quante slide vuoi nel carosello finale</p>
        <AiNumberSlider value={slideCount} onChange={onSlideCountChange} />
      </div>

      {/* Campo 3: Istruzioni extra */}
      <div className="ai-form__field">
        <label className="ai-form__label" htmlFor="ai-extra-instructions">
          Istruzioni extra <span className="ai-form__label-optional">(opzionale)</span>
        </label>
        <p className="ai-form__help">
          Indicazioni specifiche su tono, focus, slide da includere o evitare
        </p>
        <textarea
          id="ai-extra-instructions"
          className="ai-form__textarea"
          rows={3}
          placeholder="Es. 'Mantieni tono ironico nella chiusura', 'Evita riferimenti tecnici', 'La slide 1 deve essere una domanda'..."
          value={extraInstructions}
          onChange={(e) => onExtraChange(e.target.value)}
        />
      </div>

      {/* Banner few-shot */}
      <AiInfoBanner count={paletteCount} />
    </div>
  )
}
