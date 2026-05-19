/** Stima in byte la dimensione del JSON del carosello (include dati base64 immagini). */
export function estimateCarouselSize(carousel) {
  try {
    return new Blob([JSON.stringify(carousel)]).size
  } catch {
    return 0
  }
}

/** Soglia warning nell'editor immagini (localStorage, 4MB). */
export const SIZE_WARNING_THRESHOLD = 4 * 1024 * 1024

/** Soglia warning per il salvataggio su API (content_json, 700KB). */
export const API_SIZE_WARNING_THRESHOLD = 700 * 1024

/** Soglia errore bloccante per il salvataggio su API (content_json, 1.5MB). */
export const API_SIZE_ERROR_THRESHOLD = 1.5 * 1024 * 1024

/** Formatta byte in unità leggibili (KB / MB). */
export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}
