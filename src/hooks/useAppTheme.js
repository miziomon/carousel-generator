import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'app-theme'
const VALID = ['auto', 'dark', 'light']

function getStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return VALID.includes(v) ? v : 'auto'
  } catch {
    return 'auto'
  }
}

function getResolved(preference) {
  if (preference !== 'auto') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useAppTheme() {
  const [preference, setPreference] = useState(getStored)
  const resolved = getResolved(preference)

  useEffect(() => {
    const root = document.documentElement
    if (resolved === 'light') {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [resolved])

  useEffect(() => {
    if (preference !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const r = getResolved('auto')
      const root = document.documentElement
      if (r === 'light') root.setAttribute('data-theme', 'light')
      else root.removeAttribute('data-theme')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const setTheme = useCallback((value) => {
    if (!VALID.includes(value)) return
    try { localStorage.setItem(STORAGE_KEY, value) } catch { /* noop */ }
    setPreference(value)
  }, [])

  return { preference, resolved, setTheme }
}
