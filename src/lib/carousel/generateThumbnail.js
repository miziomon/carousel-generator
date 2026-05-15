import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createElement } from 'react'
import { toPng } from 'html-to-image'
import { SlideRenderer } from '../../slide-renderer/SlideRenderer.jsx'
import { getFormat } from '../formats/registry.js'

const THUMB_MAX = 540

/**
 * Genera una thumbnail PNG della slide 1 del carosello.
 * Renderizza off-screen nel portal #export-root già presente in index.html.
 * @param {object} carousel - Carosello completo (con slides e theme)
 * @returns {Promise<string>} Data URL PNG (tipicamente 30-80 KB)
 */
export async function generateThumbnail(carousel) {
  const exportRoot = document.getElementById('export-root')
  if (!exportRoot) throw new Error('#export-root non trovato nel DOM')

  const slide = carousel.slides[0]
  if (!slide) throw new Error('Nessuna slide nel carosello')

  const format = getFormat(carousel.theme?.format)
  const { width, height } = format

  const ratio = THUMB_MAX / Math.max(width, height)
  const thumbW = Math.round(width * ratio)
  const thumbH = Math.round(height * ratio)

  const container = document.createElement('div')
  container.style.cssText = `width:${width}px;height:${height}px;position:absolute;left:0;top:0;overflow:hidden;`
  exportRoot.appendChild(container)

  const root = createRoot(container)

  try {
    flushSync(() => {
      root.render(
        createElement(SlideRenderer, {
          slide,
          theme: carousel.theme,
          total: carousel.slides.length,
          mode: 'export',
        })
      )
    })

    await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    return await toPng(container, {
      width,
      height,
      canvasWidth: thumbW,
      canvasHeight: thumbH,
      pixelRatio: 1,
      cacheBust: true,
      style: { width: `${width}px`, height: `${height}px` },
    })
  } finally {
    root.unmount()
    if (exportRoot.contains(container)) exportRoot.removeChild(container)
  }
}
