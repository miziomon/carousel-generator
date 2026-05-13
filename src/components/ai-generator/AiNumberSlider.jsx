/**
 * Slider 8-18 per il numero di slide, con toggle "Auto".
 * value: number (8-18) | 'auto'
 * onChange: (value: number | 'auto') => void
 */
export function AiNumberSlider({ value, onChange }) {
  const isAuto = value === 'auto'
  // Posizione fisica dello slider: quando è in modalità auto usiamo 12 come riferimento
  const sliderPos = isAuto ? 12 : value

  function handleSliderChange(e) {
    onChange(Number(e.target.value))
  }

  function handleAutoClick() {
    onChange('auto')
  }

  return (
    <div className="ai-form__slider-row">
      <input
        type="range"
        min={8}
        max={18}
        step={1}
        value={sliderPos}
        onChange={handleSliderChange}
        className="ai-form__slider"
        aria-label="Numero di slide"
      />
      <span className="ai-form__slider-value">
        {isAuto ? 'Auto' : `${value} slide`}
      </span>
      <button
        type="button"
        className={'ai-form__slider-auto' + (isAuto ? ' ai-form__slider-auto--active' : '')}
        onClick={handleAutoClick}
        title="Lascia decidere all'AI il numero ottimale di slide"
      >
        Auto
      </button>
    </div>
  )
}
