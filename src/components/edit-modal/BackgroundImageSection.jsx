import { BackgroundImageUpload } from './BackgroundImageUpload.jsx'
import { BackgroundImageEditor } from './BackgroundImageEditor.jsx'

const DEFAULT_BG_IMAGE = {
  data:     '',
  opacity:  1,
  blur:     0,
  position: 'center',
  overlay:  { enabled: false, type: 'palette', intensity: 0.5 },
}

export function BackgroundImageSection({ bgImage, theme, format, carousel, onChange }) {
  const hasImage = !!bgImage?.data

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
    if (window.confirm('Rimuovere l\'immagine di sfondo da questa slide?')) {
      onChange(undefined)
    }
  }

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

  return <BackgroundImageUpload onUpload={handleUpload} />
}
