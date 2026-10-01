import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Il modulo virtuale di vite-plugin-pwa: si simula useRegisterSW, catturandone le opzioni
const sw = vi.hoisted(() => ({
  options: null,
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options) => {
    sw.options = options
    return {
      needRefresh: [sw.needRefresh, sw.setNeedRefresh],
      updateServiceWorker: sw.updateServiceWorker,
    }
  },
}))

import { usePwaUpdate, watchForUpdates } from '../hooks/usePwaUpdate.js'

const HOUR = 60 * 60 * 1000
const MIN = 60 * 1000

function fakeRegistration() {
  return { update: vi.fn(() => Promise.resolve()) }
}

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

function setOnline(online) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true })
}

beforeEach(() => {
  vi.useFakeTimers()
  setOnline(true)
  sw.options = null
  sw.needRefresh = false
  sw.setNeedRefresh.mockClear()
  sw.updateServiceWorker.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  setVisibility('visible')
})

describe('watchForUpdates', () => {
  it('controlla gli aggiornamenti a intervalli regolari', () => {
    const reg = fakeRegistration()
    watchForUpdates(reg)
    expect(reg.update).not.toHaveBeenCalled()
    vi.advanceTimersByTime(HOUR)
    expect(reg.update).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(HOUR)
    expect(reg.update).toHaveBeenCalledTimes(2)
  })

  it('non controlla se il browser è offline', () => {
    const reg = fakeRegistration()
    watchForUpdates(reg)
    setOnline(false)
    vi.advanceTimersByTime(HOUR)
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('al ritorno in primo piano controlla solo dopo l intervallo minimo', () => {
    const reg = fakeRegistration()
    watchForUpdates(reg)

    vi.advanceTimersByTime(2 * MIN)
    setVisibility('visible')
    expect(reg.update).not.toHaveBeenCalled()   // troppo presto

    vi.advanceTimersByTime(4 * MIN)             // totale 6 minuti
    setVisibility('visible')
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('non controlla quando la scheda passa in background', () => {
    const reg = fakeRegistration()
    watchForUpdates(reg)
    vi.advanceTimersByTime(10 * MIN)
    setVisibility('hidden')
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('un update() fallito non genera errori non gestiti', async () => {
    const reg = { update: vi.fn(() => Promise.reject(new Error('rete'))) }
    watchForUpdates(reg)
    vi.advanceTimersByTime(HOUR)
    await vi.advanceTimersByTimeAsync(0)
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('la funzione di pulizia ferma timer e listener', () => {
    const reg = fakeRegistration()
    const stop = watchForUpdates(reg)
    stop()
    vi.advanceTimersByTime(2 * HOUR)
    vi.advanceTimersByTime(10 * MIN)
    setVisibility('visible')
    expect(reg.update).not.toHaveBeenCalled()
  })

  it('rispetta intervalli personalizzati', () => {
    const reg = fakeRegistration()
    watchForUpdates(reg, { intervalMs: 1000 })
    vi.advanceTimersByTime(3000)
    expect(reg.update).toHaveBeenCalledTimes(3)
  })
})

describe('usePwaUpdate', () => {
  it('espone needRefresh dal service worker', () => {
    sw.needRefresh = true
    const { result } = renderHook(() => usePwaUpdate())
    expect(result.current.needRefresh).toBe(true)
  })

  it('reload attiva il nuovo service worker e ricarica la pagina', () => {
    const { result } = renderHook(() => usePwaUpdate())
    act(() => result.current.reload())
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('dismiss nasconde l avviso senza aggiornare', () => {
    const { result } = renderHook(() => usePwaUpdate())
    act(() => result.current.dismiss())
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false)
    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('alla registrazione del service worker avvia il controllo periodico', () => {
    renderHook(() => usePwaUpdate())
    const reg = fakeRegistration()
    sw.options.onRegisteredSW('/sw.js', reg)
    vi.advanceTimersByTime(HOUR)
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('senza registration (SW non supportato) non fa nulla', () => {
    renderHook(() => usePwaUpdate())
    expect(() => sw.options.onRegisteredSW('/sw.js', undefined)).not.toThrow()
  })
})
