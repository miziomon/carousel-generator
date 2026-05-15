import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { SlideRenderer } from '../slide-renderer/SlideRenderer.jsx'
import { getFormat } from './formats/registry.js'

/**
 * Esporta una slide come PNG a risoluzione 2× rispetto al formato del carosello.
 * Renderizza nel portal #export-root (off-screen) per evitare layout thrashing.
 * @returns {Promise<string>} data URL PNG
 */
export async function exportSlideToPng(slide, theme, total) {
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
      pixelRatio: 2,
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
