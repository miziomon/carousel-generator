const POSITIONS = [
  'top-left', 'top', 'top-right',
  'left',     'center', 'right',
  'bottom-left', 'bottom', 'bottom-right',
]

const LABELS = {
  'top-left':     'In alto a sinistra',
  'top':          'In alto al centro',
  'top-right':    'In alto a destra',
  'left':         'A sinistra',
  'center':       'Al centro',
  'right':        'A destra',
  'bottom-left':  'In basso a sinistra',
  'bottom':       'In basso al centro',
  'bottom-right': 'In basso a destra',
}

export function PositionGrid({ value, onChange }) {
  return (
    <div className="position-grid" role="group" aria-label="Posizione immagine">
      {POSITIONS.map((pos) => (
        <button
          key={pos}
          type="button"
          className={`position-grid__cell${pos === value ? ' position-grid__cell--active' : ''}`}
          title={LABELS[pos]}
          aria-label={LABELS[pos]}
          aria-pressed={pos === value}
          onClick={() => onChange(pos)}
        />
      ))}
    </div>
  )
}
