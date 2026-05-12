const DRAFT_KEY    = 'carosello.draft.v1'
const PREFS_KEY    = 'carosello.preferences.v1'
const PALETTES_KEY = 'carosello.palettes.v1'

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDraft(carousel) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(carousel))
    return true
  } catch {
    return false
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignorato
  }
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignorato
  }
}

// ─── Palette library ──────────────────────────────────────────────────────────

/**
 * Carica le palette utente da localStorage.
 * Ritorna solo le palette con origin: "user" — le built-in vivono in codice.
 * Se il payload è corrotto, logga un warning e restituisce [] senza crashare.
 *
 * @returns {Array<object>}
 */
export function loadPalettes() {
  try {
    const raw = localStorage.getItem(PALETTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Filtra eventuali palette system finite per errore in localStorage
    return parsed.filter((p) => p?.origin === 'user')
  } catch (err) {
    console.warn('[storage] loadPalettes: payload corrotto, reset a []', err)
    return []
  }
}

/**
 * Salva la lista di palette utente su localStorage.
 * Salva SOLO origin: "user" — le built-in sono in codice, non devono stare in storage.
 *
 * @param {Array<object>} palettes
 */
export function savePalettes(palettes) {
  try {
    const userOnly = palettes.filter((p) => p?.origin === 'user')
    localStorage.setItem(PALETTES_KEY, JSON.stringify(userOnly))
  } catch {
    // quota exceeded o altro errore I/O — non bloccare l'app
  }
}

/**
 * Rimuove la libreria palette da localStorage.
 * Utile per dev tools o reset completo.
 */
export function clearPalettes() {
  try {
    localStorage.removeItem(PALETTES_KEY)
  } catch {
    // ignorato
  }
}
