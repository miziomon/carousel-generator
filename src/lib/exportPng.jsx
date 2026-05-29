import { renderSlideAsPng } from './renderSlideAsPng.jsx'

/**
 * Esporta una slide come PNG retina (pixelRatio 2×).
 * Thin wrapper su renderSlideAsPng per compatibilità con SlideCard e exportZip.
 *
 * @param {object} slide
 * @param {object} theme
 * @param {number} total - numero totale slide (per il footer progressivo)
 * @returns {Promise<string>} data URL PNG
 */
export async function exportSlideToPng(slide, theme, total) {
  return renderSlideAsPng(slide, theme, total, { pixelRatio: 2 })
}
