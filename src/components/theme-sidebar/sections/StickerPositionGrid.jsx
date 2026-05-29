import './sticker-position-grid.css'

/**
 * Griglia 5×5 per impostare la posizione dello sticker sulla slide.
 * Le coordinate x/y sono percentuali (0, 25, 50, 75, 100).
 *
 * @param {{ x: number, y: number }} value   - Posizione corrente.
 * @param {function}                 onChange - Callback con { x, y }.
 */
export function StickerPositionGrid({ value, onChange }) {
  const cols = [0, 25, 50, 75, 100]
  const rows = [0, 25, 50, 75, 100]

  return (
    <div className="sticker-pos-grid">
      {rows.map((y) =>
        cols.map((x) => {
          const active = value?.x === x && value?.y === y
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              className={`sticker-pos-grid__cell${active ? ' sticker-pos-grid__cell--active' : ''}`}
              onClick={() => onChange({ x, y })}
              aria-label={`Posizione ${x}% ${y}%`}
              aria-pressed={active}
            />
          )
        })
      )}
    </div>
  )
}
