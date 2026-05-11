import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toPng } from 'html-to-image'
import { SlideRenderer } from '../slide-renderer/SlideRenderer.jsx'

const SLIDE_SIZE = 1080

/**
 * Esporta una slide come PNG 2160×2160 (pixelRatio 2).
 * Renderizza nel portal #export-root (off-screen) per evitare layout thrashing.
 * @returns {Promise<string>} data URL PNG
 */
export async function exportSlideToPng(slide, theme, total) {
  const exportRoot = document.getElementById('export-root')
  if (!exportRoot) throw new Error('#export-root non trovato nel DOM')

  const container = document.createElement('div')
  container.style.cssText = `width:${SLIDE_SIZE}px;height:${SLIDE_SIZE}px;position:absolute;left:0;top:0;overflow:hidden;`
  exportRoot.appendChild(container)

  const root = createRoot(container)

  try {
    // flushSync garantisce che il render sia sincrono prima di procedere
    flushSync(() => {
      root.render(
        <SlideRenderer slide={slide} theme={theme} total={total} mode="export" />
      )
    })

    // Attende che tutti i font siano caricati (font-display: block)
    await document.fonts.ready

    // Piccola pausa per assicurare il layout delle immagini di sfondo
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const dataUrl = await toPng(container, {
      pixelRatio: 2,
      cacheBust: true,
      width: SLIDE_SIZE,
      height: SLIDE_SIZE,
    })

    return dataUrl
  } finally {
    root.unmount()
    if (exportRoot.contains(container)) {
      exportRoot.removeChild(container)
    }
  }
}
