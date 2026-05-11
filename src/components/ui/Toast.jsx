import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-yellow-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
}

let globalAdd = null

function ToastItem({ id, message, type = 'success', onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(id), 3500)
    return () => clearTimeout(t)
  }, [id, onRemove])

  return (
    <div className="flex items-center gap-2.5 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 shadow-lg text-sm text-slate-100 min-w-56 max-w-xs">
      {ICONS[type]}
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onRemove(id)}
        className="p-0.5 hover:text-white text-slate-400 transition-colors"
        aria-label="Chiudi notifica"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const add = useCallback((message, type = 'success') => {
    const id = ++counterRef.current
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Espone la funzione add globalmente per uso da fuori React
  useEffect(() => {
    globalAdd = add
    return () => { globalAdd = null }
  }, [add])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={remove} />
      ))}
    </div>,
    document.body
  )
}

// Funzione di utilità per aggiungere toast da qualunque punto dell'app
export function toast(message, type = 'success') {
  if (globalAdd) globalAdd(message, type)
}
