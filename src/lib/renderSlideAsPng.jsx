import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { SlideRenderer } from '../slide-renderer/SlideRenderer.jsx'
import { getFormat } from './formats/registry.js'

/**
 * Renderizza una singola slide come PNG data URL.
 * Funzione condivisa tra export che richiedono pixelRatio configurabile.
 *
 * @param {object} slide
 * @param {object} theme
 * @param {number} total  - numero totale slide (per il footer progressivo)
 * @param {object} [options]
 * @param {number} [options.pixelRatio=2] - 1 per PDF (peso ridotto), 2 per PNG/ZIP retina
 * @returns {Promise<string>} Data URL PNG
 */
export async function renderSlideAsPng(slide, theme, total, options = {}) {
  const { pixelRatio = 2 } = options

  const exportRoot = document.getElementById('export-root')
  if (!exportRoot) throw new Error('#export-root non trovato nel DOM')

  const format = getFormat(theme.format)
  const { width, height } = format

  const container = document.createElement('div')
  container.style.cssText = `width:${width}px;height:${height}px;position:absolute;left:0;top:0;overflow:hidden;`
  exportRoot.appendChild(container)

  const root = createRoot(container)

  try {
    flushSync(() => {
      root.render(
        <SlideRenderer slide={slide} theme={theme} total={total} mode="export" />
      )
    })

    await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(container, {
      pixelRatio,
      cacheBust: true,
      width,
      height,
    })

    return dataUrl
  } finally {
    root.unmount()
    if (exportRoot.contains(container)) {
      exportRoot.removeChild(container)
    }
  }
}
