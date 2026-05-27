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
 *   - bgImage?.data → editor slide-specifico (immagine propria)
 *   - bgImage senza data + globale → editor con impostazioni override (image dal tema)
 *
 * In modalità globale (isGlobal=true):
 *   - bgImage?.data → editor
 *   - altrimenti → upload
 */
export function BackgroundImageSection({ bgImage, theme, format, carousel, onChange, isGlobal = false, onBrowseLibrary }) {
  const hasImage = !!bgImage?.data
  const isForceNone = !isGlobal && bgImage === null
  const globalImage = !isGlobal ? theme?.background_image : null
  const isInheriting = !isGlobal && bgImage === undefined && !!globalImage?.data
  // Slide con override impostazioni (opacity/blur/ecc.) ma senza immagine propria — usa quella globale
  const hasSettingsOverride = !isGlobal && bgImage !== undefined && bgImage !== null && !hasImage && !!globalImage?.data

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

  function handleRemoveSettingsOverride() {
    if (window.confirm("Rimuovere la personalizzazione? La slide tornerà a ereditare completamente l'immagine globale.")) {
      onChange(undefined)
    }
  }

  // ── Stato: immagine propria della slide (o immagine globale in modalità globale) ──
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
        onBrowseLibrary={onBrowseLibrary}
      />
    )
  }

  // ── Stato: override impostazioni senza immagine propria (usa data dal tema) ─
  if (hasSettingsOverride) {
    // L'editor mostra il global data come anteprima, ma onChange usa bgImage (senza data)
    const effectiveBgForDisplay = { ...globalImage, ...bgImage }
    return (
      <BackgroundImageEditor
        bgImage={effectiveBgForDisplay}
        theme={theme}
        format={format}
        carousel={carousel}
        onChange={handleChange}
        onReplace={handleReplace}
        onRemove={handleRemoveSettingsOverride}
        onBrowseLibrary={onBrowseLibrary}
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
            onClick={() => onChange({
              opacity:  globalImage.opacity,
              blur:     globalImage.blur,
              position: globalImage.position,
              overlay:  { ...globalImage.overlay },
            })}
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
  return <BackgroundImageUpload onUpload={handleUpload} onBrowseLibrary={onBrowseLibrary} />
}
