import { FORMATS } from '../../lib/formats/registry.js'
import './format-selector.css'

export function FormatSelector({ currentId, onSelect }) {
  return (
    <div className="format-selector" role="listbox" aria-label="Formato slide">
      {FORMATS.map((fmt) => {
        const active = fmt.id === currentId
        return (
          <button
            key={fmt.id}
            type="button"
            role="option"
            aria-selected={active}
            className={`format-selector__option${active ? ' format-selector__option--active' : ''}`}
            onClick={() => onSelect(fmt.id)}
          >
            <span className={`format-selector__radio${active ? ' format-selector__radio--selected' : ''}`} aria-hidden="true" />
            <span className="format-selector__info">
              <span className="format-selector__name">{fmt.name}</span>
              <span className="format-selector__dimensions">
                {fmt.aspect_label} · {fmt.width}×{fmt.height}
              </span>
              <span className="format-selector__description">{fmt.description}</span>
              {fmt.recommended && (
                <span className="format-selector__badge format-selector__badge--recommended">
                  consigliato
                </span>
              )}
              {fmt.warning && (
                <span className="format-selector__badge format-selector__badge--warning">
                  ⚠ {fmt.warning}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
