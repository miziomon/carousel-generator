import { useRef } from 'react'
import { getFormat } from '../../../lib/formats/registry.js'
import './sticker-position-picker.css'

/**
 * Controllo posizionamento sticker: due slider X/Y + area interattiva cliccabile/trascinabile.
 * L'area rispetta l'aspect ratio del formato slide corrente.
 * I valori x/y sono interi 0-100 (percentuali, clampati).
 *
 * @param {{ x: number, y: number }} value    - Posizione corrente.
 * @param {function}                 onChange - Callback con { x, y } aggiornati.
 * @param {string}                   formatId - ID del formato slide corrente.
 */
export function StickerPositionPicker({ value, onChange, formatId }) {
  const areaRef = useRef(null)
  const fmt = getFormat(formatId)
  const x = value?.x ?? 50
  const y = value?.y ?? 50

  function clamp(v) {
    return Math.round(Math.max(0, Math.min(100, v)))
  }

  function computeFromPointer(e) {
    const rect = areaRef.current.getBoundingClientRect()
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    }
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(computeFromPointer(e))
  }

  function handlePointerMove(e) {
    if (e.buttons === 0) return
    onChange(computeFromPointer(e))
  }

  return (
    <div className="sticker-pos-picker">
      {/* Slider X */}
      <div className="sticker-pos-picker__row">
        <label className="sticker-pos-picker__label">X</label>
        <div className="sticker-pos-picker__slider-wrap">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={x}
            onChange={(e) => onChange({ x: Number(e.target.value), y })}
            className="sticker-pos-picker__range"
            aria-label="Posizione orizzontale sticker"
          />
          <span className="sticker-pos-picker__val">{x}%</span>
        </div>
      </div>

      {/* Slider Y */}
      <div className="sticker-pos-picker__row">
        <label className="sticker-pos-picker__label">Y</label>
        <div className="sticker-pos-picker__slider-wrap">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={y}
            onChange={(e) => onChange({ x, y: Number(e.target.value) })}
            className="sticker-pos-picker__range"
            aria-label="Posizione verticale sticker"
          />
          <span className="sticker-pos-picker__val">{y}%</span>
        </div>
      </div>

      {/* Area interattiva */}
      <div
        ref={areaRef}
        className="sticker-pos-picker__area"
        style={{ aspectRatio: `${fmt.width} / ${fmt.height}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        aria-label="Area posizionamento sticker"
        role="presentation"
      >
        <div
          className="sticker-pos-picker__dot"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>
    </div>
  )
}
