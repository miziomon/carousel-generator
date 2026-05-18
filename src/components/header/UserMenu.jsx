import { useState, useEffect, useRef } from 'react'
import { ChevronDown, BookOpen, Settings, LogOut } from 'lucide-react'
import '../carousel-library/carousel-library.css'

export function UserMenu({ user, onOpenLibrary, onOpenPreferences, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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
