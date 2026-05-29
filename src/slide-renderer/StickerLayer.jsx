/**
 * Layer sticker: immagine posizionata sopra il contenuto della slide.
 * Renderizzato solo se sticker è presente e ha un campo data valido.
 *
 * @param {{ data: string, size: number, rotation: number, opacity: number, position: { x: number, y: number } }} sticker
 */
export function StickerLayer({ sticker }) {
  if (!sticker?.data) return null

  const { data, size, rotation, opacity, position } = sticker
  const x = position?.x ?? 50
  const y = position?.y ?? 50

  const style = {
    left:      `${x}%`,
    top:       `${y}%`,
    transform: `translate(-50%, -50%) rotate(${rotation ?? 0}deg)`,
    maxWidth:  `${size ?? 150}px`,
    maxHeight: `${size ?? 150}px`,
    opacity:   opacity ?? 1,
  }

  return (
    <img
      className="slide__sticker"
      src={data}
      alt=""
      style={style}
      aria-hidden="true"
    />
  )
}
