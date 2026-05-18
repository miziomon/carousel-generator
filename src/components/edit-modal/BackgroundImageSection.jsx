import { BackgroundImageUpload } from './BackgroundImageUpload.jsx'
import { BackgroundImageEditor } from './BackgroundImageEditor.jsx'

const DEFAULT_BG_IMAGE = {
  data:     '',
  opacity:  1,
  blur:     0,
  position: 'center',
  overlay:  { enabled: false, type: 'palette', intensity: 0.5 },
}

/**
 * Gestisce l'immagine di sfondo per una slide (o per il tema globale).
 *
 * In modalità slide (isGlobal=false):
 *   - bgImage === undefined + no globale → upload
 *   - bgImage === undefined + globale presente → stato "eredita"
 *   - bgImage === null → "nessuno sfondo forzato"
 *   - bgImage?.data → editor slide-specifico
 *
 * In modalità globale (isGlobal=true):
 *   - bgImage?.data → editor
 *   - altrimenti → upload
 */
export function BackgroundImageSection({ bgImage, theme, format, carousel, onChange, isGlobal = false }) {
  const hasImage = !!bgImage?.data
  const isForceNone = !isGlobal && bgImage === null
  const globalImage = !isGlobal ? theme?.background_image : null
  const isInheriting = !isGlobal && bgImage === undefined && !!globalImage?.data

  function handleUpload(dataUrl) {
    onChange({ ...DEFAULT_BG_IMAGE, data: dataUrl })
  }

  function handleChange(patch) {
    onChange({ ...bgImage, ...patch })
  }

  function handleReplace(dataUrl) {
    onChange({ ...bgImage, data: dataUrl })
  }

  function handleRemove() {
    const msg = isGlobal
      ? "Rimuovere l'immagine di sfondo globale?"
      : globalImage?.data
        ? "Rimuovere l'immagine? La slide tornerà a ereditare quella globale."
        : "Rimuovere l'immagine di sfondo da questa slide?"
    if (window.confirm(msg)) {
      onChange(undefined)
    }
  }

  // ── Stato: immagine custom (slide o globale) ─────────────────────────────
  if (hasImage) {
    return (
      <BackgroundImageEditor
        bgImage={bgImage}
        theme={theme}
        format={format}
        carousel={carousel}
        onChange={handleChange}
        onReplace={handleReplace}
        onRemove={handleRemove}
      />
    )
  }

  // ── Stato: nessuno sfondo forzato su questa slide ─────────────────────────
  if (isForceNone) {
    return (
      <div className="bg-image-section bg-image-section--force-none">
        <p className="bg-image-section__label">
          Nessuno sfondo su questa slide
        </p>
        <p className="bg-image-section__sub">
          Questa slide ignora l&apos;immagine globale.
        </p>
        <button
          type="button"
          className="bg-image-section__restore-btn"
          onClick={() => onChange(undefined)}
        >
          Ripristina (eredita globale)
        </button>
      </div>
    )
  }

  // ── Stato: eredita immagine dal tema globale ──────────────────────────────
  if (isInheriting) {
    return (
      <div className="bg-image-section bg-image-section--inheriting">
        <p className="bg-image-section__label">
          Immagine ereditata dal tema globale
        </p>
        <p className="bg-image-section__sub">
          Questa slide mostra l&apos;immagine impostata nella sidebar.
        </p>
        <div className="bg-image-section__inherit-actions">
          <button
            type="button"
            className="bg-image-section__customize-btn"
            onClick={() => onChange({ ...globalImage })}
          >
            Personalizza per questa slide
          </button>
          <button
            type="button"
            className="bg-image-section__force-none-btn"
            onClick={() => onChange(null)}
          >
            Nessuno sfondo su questa slide
          </button>
        </div>
      </div>
    )
  }

  // ── Stato default: nessuna immagine → upload ──────────────────────────────
  return <BackgroundImageUpload onUpload={handleUpload} />
}
