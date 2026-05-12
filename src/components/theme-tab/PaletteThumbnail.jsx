/**
 * Mostra 6 quadratini colorati che rappresentano visivamente una palette.
 * Riutilizzato nel selettore dropdown e nel gestore palette (Fase 3).
 *
 * @param {object} colors  — oggetto palette con i 6 slot colore
 * @param {number} size    — dimensione in px di ogni quadratino (default 18)
 */
export function PaletteThumbnail({ colors, size = 18 }) {
  const slots = ['background', 'surface', 'foreground', 'accent', 'muted', 'line']

  return (
    <span className="palette-thumbnail" aria-hidden="true">
      {slots.map((slot) => (
        <span
          key={slot}
          className="palette-thumbnail__swatch"
          style={{
            backgroundColor: colors?.[slot] ?? '#888',
            width: size,
            height: size,
          }}
          title={slot}
        />
      ))}
    </span>
  )
}
