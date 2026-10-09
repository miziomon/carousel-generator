import { useState, useEffect, useRef } from 'react'
import { ChevronDown, BookOpen, Settings, LogOut } from 'lucide-react'
import { fetchCarouselUsage } from '../../lib/carousel/api.js'
import '../carousel-library/carousel-library.css'

// Livello della barra in base alla percentuale usata: rosso da 90%, giallo da 70%
function usageLevel(percent) {
  if (percent >= 90) return 'danger'
  if (percent >= 70) return 'warning'
  return 'ok'
}

export function UserMenu({ user, onOpenLibrary, onOpenPreferences, onLogout }) {
  const [open, setOpen] = useState(false)
  // Uso mensile dei caroselli: null finché non è caricato (o se il caricamento fallisce,
  // nel qual caso il blocco resta nascosto)
  const [usage, setUsage] = useState(null)
  const ref = useRef(null)

  // Riletto a ogni apertura del menu: i caroselli creati nel frattempo sono già contati
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchCarouselUsage()
      .then((data) => { if (!cancelled) setUsage(data.items?.[0] ? { ...data.items[0], exempt: data.exempt } : null) })
      .catch(() => { if (!cancelled) setUsage(null) })
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleItem(fn) {
    setOpen(false)
    fn()
  }

  // Limite -1 (o account admin) = illimitato: solo il numero, senza barra
  const unlimited = usage && (usage.exempt || usage.limit === -1)
  // Limite 0 = funzione non compresa nel piano: barra piena
  const percent = usage && !unlimited
    ? (usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 100)
    : 0

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        title={user?.email}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</span>
        <ChevronDown size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
      </button>

      {open && (
        <div className="user-menu__dropdown">
          <p className="user-menu__email">{user?.email}</p>
          <div className="user-menu__sep" />
          {usage && (
            <>
              <div className="user-menu__usage">
                <div className="user-menu__usage-head">
                  <span>Caroselli questo mese</span>
                  <span className="user-menu__usage-count">
                    {unlimited ? `${usage.used} · illimitati` : `${usage.used} / ${usage.limit}`}
                  </span>
                </div>
                {!unlimited && (
                  <div
                    className="user-menu__usage-bar"
                    role="progressbar"
                    aria-label="Caroselli creati nel mese"
                    aria-valuemin={0}
                    aria-valuemax={usage.limit}
                    aria-valuenow={Math.min(usage.used, usage.limit)}
                  >
                    <div
                      className={`user-menu__usage-fill user-menu__usage-fill--${usageLevel(percent)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="user-menu__sep" />
            </>
          )}
          <button
            type="button"
            className="user-menu__item"
            onClick={() => handleItem(onOpenLibrary)}
          >
            <BookOpen size={13} />
            I tuoi caroselli
          </button>
          <button
            type="button"
            className="user-menu__item"
            onClick={() => handleItem(onOpenPreferences)}
          >
            <Settings size={13} />
            Preferenze
          </button>
          <div className="user-menu__sep" />
          <button
            type="button"
            className="user-menu__item user-menu__item--danger"
            onClick={() => handleItem(onLogout)}
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
