import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, Package, FileJson } from 'lucide-react'
import { Button } from '../ui/Button.jsx'
import { Modal } from '../ui/Modal.jsx'
import { exportCarouselZip } from '../../lib/exportZip.js'
import { toast } from '../ui/Toast.jsx'
import './export-panel.css'

// ─── Modal di progresso ZIP ───────────────────────────────────────────────────
function ExportProgressModal({ open, current, total, label, onClose }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const done = current >= total && total > 0

  return (
    <Modal open={open} onClose={done ? onClose : undefined} title="Esportazione ZIP" size="sm">
      <div className="export-progress">
        <div className="export-progress__label">{label || 'Inizializzazione…'}</div>
        <div className="export-progress__bar-wrap">
          <div className="export-progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="export-progress__pct">{pct}%</div>
        {done && (
          <Button variant="primary" size="sm" onClick={onClose} style={{ marginTop: 16 }}>
            Chiudi
          </Button>
        )}
      </div>
    </Modal>
  )
}

// ─── Dropdown export ──────────────────────────────────────────────────────────
export function ExportPanel({ carousel, onExportJson }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [zipProgress, setZipProgress] = useState(null) // null | { current, total, label }
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleExportZip() {
    setMenuOpen(false)
    setZipProgress({ current: 0, total: carousel.slides.length, label: 'Inizializzazione…' })
    try {
      await exportCarouselZip(carousel, (progress) => {
        setZipProgress(progress)
      })
      toast('ZIP esportato', 'success')
    } catch (err) {
      console.error('Export ZIP fallito:', err)
      toast(`Errore export: ${err.message}`, 'error')
    }
  }

  function handleExportJson() {
    setMenuOpen(false)
    onExportJson()
  }

  return (
    <>
      <div className="export-panel" ref={menuRef}>
        {menuOpen && (
          <div className="export-panel__menu">
            <button className="export-panel__item" onClick={handleExportJson}>
              <FileJson size={14} />
              Esporta JSON
            </button>
            <button className="export-panel__item" onClick={handleExportZip}>
              <Package size={14} />
              Esporta ZIP (PNG + JSON)
            </button>
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => setMenuOpen((v) => !v)} title="Opzioni export">
          <Download size={14} />
          Esporta
          <ChevronDown size={12} style={{ opacity: 0.6 }} />
        </Button>
      </div>

      {zipProgress && (
        <ExportProgressModal
          open
          current={zipProgress.current}
          total={zipProgress.total}
          label={zipProgress.label}
          onClose={() => setZipProgress(null)}
        />
      )}
    </>
  )
}
