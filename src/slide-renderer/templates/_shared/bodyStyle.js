import { resolveTextShadow } from './textShadowPresets.js'

/**
 * Costruisce l'oggetto style inline del body di una slide.
 * Punto unico dove vengono iniettati colore override e ombra testo per-slide.
 *
 * @param {string} prefix - Prefisso BEM: 'editorial' | 'bold'
 * @param {{ finalSize: number, finalLH: number, fontVars: object, slide: object }} opts
 * @returns {object} React style object da applicare al div .{prefix}__body
 */
export function buildBodyStyle(prefix, { finalSize, finalLH, fontVars, slide }) {
  const style = {
    [`--${prefix}-body-size`]:        `${finalSize}px`,
    [`--${prefix}-body-line-height`]: finalLH,
    ...fontVars,
  }

  if (slide.color_override) {
    style['--slide-body-color'] = slide.color_override
  }

  const shadow = resolveTextShadow(slide.text_shadow)
  if (shadow !== 'none') {
    style['--slide-body-text-shadow'] = shadow
  }

  return style
}
