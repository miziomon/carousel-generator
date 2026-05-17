import { useState, useCallback } from 'react'

const UI_PREFS_KEY = 'carosello.ui-preferences'

const DEFAULT_PREFS = {
  sidebarOpen: true,
  fontShowAll: false,
  sidebarSections: {
    formato:  true,
    template: false,
    palette:  true,
    header:   false,
    footer:   false,
    fonts:    false,
    reset:    false,
  },
}

function load() {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      sidebarSections: { ...DEFAULT_PREFS.sidebarSections, ...parsed.sidebarSections },
    }
  } catch {
    console.warn('[useUiPreferences] preferenze corrotte, reset a default')
    return DEFAULT_PREFS
  }
}

function persist(prefs) {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // quota exceeded o errore I/O
  }
}

/**
 * Gestisce le preferenze UI persistite (sidebar aperta/chiusa, sezioni espanse).
 * Tenute fuori dal useCarouselStore: non entrano nell'undo/redo.
 */
export function useUiPreferences() {
  const [uiPrefs, setUiPrefs] = useState(() => load())

  const setSidebarOpen = useCallback((open) => {
    setUiPrefs((prev) => {
      const next = { ...prev, sidebarOpen: open }
      persist(next)
      return next
    })
  }, [])

  const toggleSidebar = useCallback(() => {
    setUiPrefs((prev) => {
      const next = { ...prev, sidebarOpen: !prev.sidebarOpen }
      persist(next)
      return next
    })
  }, [])

  const setSectionOpen = useCallback((section, open) => {
    setUiPrefs((prev) => {
      const next = {
        ...prev,
        sidebarSections: { ...prev.sidebarSections, [section]: open },
      }
      persist(next)
      return next
    })
  }, [])

  const setFontShowAll = useCallback((value) => {
    setUiPrefs((prev) => {
      const next = { ...prev, fontShowAll: value }
      persist(next)
      return next
    })
  }, [])

  return { uiPrefs, setSidebarOpen, toggleSidebar, setSectionOpen, setFontShowAll }
}
