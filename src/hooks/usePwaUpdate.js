import { useRegisterSW } from 'virtual:pwa-register/react'

// Ogni quanto ricontrollare in background se esiste un nuovo service worker:
// il browser lo fa da solo solo a una nuova navigazione, ma l'editor resta
// aperto in una scheda per ore.
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 ora

// Al ritorno in primo piano si ricontrolla, ma non più spesso di così
// (evita una richiesta a ogni cambio di scheda).
const MIN_FOCUS_GAP_MS = 5 * 60 * 1000 // 5 minuti

/**
 * Controlla periodicamente (e quando la scheda torna visibile) se è disponibile
 * una nuova versione dell'app. Restituisce la funzione di pulizia.
 *
 * @param {ServiceWorkerRegistration} registration
 * @param {{ intervalMs?: number, minFocusGapMs?: number }} [options]
 */
export function watchForUpdates(
  registration,
  { intervalMs = CHECK_INTERVAL_MS, minFocusGapMs = MIN_FOCUS_GAP_MS } = {},
) {
  let lastCheck = Date.now()

  function check() {
    // Offline non c'è nulla da controllare (e update() fallirebbe)
    if (!navigator.onLine) return
    lastCheck = Date.now()
    registration.update().catch(() => {})
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck >= minFocusGapMs) check()
  }

  const timer = setInterval(check, intervalMs)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

/**
 * Registrazione del service worker (vite-plugin-pwa, registerType: 'prompt' in
 * vite.config.js) + controllo delle nuove versioni. Espone `needRefresh` per
 * mostrare un avviso non invasivo (vedi UpdateToast): nessun reload automatico,
 * così non si interrompe una generazione AI o un export in corso. Il lavoro
 * non va perso comunque: il draft è già salvato dall'autosave.
 */
export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) watchForUpdates(registration)
    },
  })

  function dismiss() {
    setNeedRefresh(false)
  }

  function reload() {
    // true = ricarica la pagina subito dopo aver attivato il nuovo service worker
    updateServiceWorker(true)
  }

  return { needRefresh, dismiss, reload }
}
