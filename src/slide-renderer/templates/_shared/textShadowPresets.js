export const SHADOW_PRESETS = ['none', 'soft', 'soft-lg', 'drop', 'hard-thin', 'hard-bold']

function hexWithAlpha(hex, alpha) {
  // Gestisce sia #rgb sia #rrggbb
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const PRESET_FNS = {
  none:       ()      => 'none',
  soft:       (color) => `1px 1px 4px ${hexWithAlpha(color, 0.4)}`,
  'soft-lg':  (color) => `2px 2px 8px ${hexWithAlpha(color, 0.5)}`,
  drop:       (color) => `3px 3px 6px ${hexWithAlpha(color, 0.6)}`,
  'hard-thin':(color) => `2px 2px 0 ${color}`,
  'hard-bold':(color) => `4px 4px 0 ${color}`,
}

/**
 * Risolve un oggetto text_shadow in un valore CSS text-shadow.
 * @param {{ preset: string, color: string }|undefined} textShadow
 * @returns {string}
 */
export function resolveTextShadow(textShadow) {
  if (!textShadow || !textShadow.preset || textShadow.preset === 'none') return 'none'
  const fn = PRESET_FNS[textShadow.preset]
  if (!fn) return 'none'
  return fn(textShadow.color ?? '#000000')
}
