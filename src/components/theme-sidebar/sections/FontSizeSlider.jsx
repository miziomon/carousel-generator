import { useCallback, useRef } from 'react'
import './font-size-slider.css'

const MIN = 8
const MAX = 120

/**
 * Slider + input numerico per impostare la dimensione base di uno slot font (px).
 * Il cambiamento viene debounced per non saturare la history dello store.
 */
export function FontSizeSlider({ slot, value, onChange }) {
  const timerRef = useRef(null)

  const dispatch = useCallback((px) => {
    const clamped = Math.round(Math.min(MAX, Math.max(MIN, px)))
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(slot, clamped), 150)
  }, [slot, onChange])

  function handleSlider(e) {
    dispatch(Number(e.target.value))
  }

  function handleInput(e) {
    const parsed = parseInt(e.target.value, 10)
    if (!isNaN(parsed)) dispatch(parsed)
  }

  return (
    <div className="font-size-slider">
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={value}
        onChange={handleSlider}
        className="font-size-slider__range"
        aria-label={`Dimensione font ${slot}`}
      />
      <input
        type="number"
        min={MIN}
        max={MAX}
        value={value}
        onChange={handleInput}
        className="font-size-slider__num"
        aria-label={`${value}px`}
      />
      <span className="font-size-slider__unit">px</span>
    </div>
  )
}
