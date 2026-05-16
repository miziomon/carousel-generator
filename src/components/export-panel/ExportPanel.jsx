import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, Package, FileJson, FileText, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button.jsx'
import { Modal } from '../ui/Modal.jsx'
import { exportCarouselZip } from '../../lib/exportZip.js'
import { exportCarouselAsPdf } from '../../lib/exportPdf.js'
import { toast } from '../ui/Toast.jsx'
import { ExportPdfLandscapeWarning } from './ExportPdfLandscapeWarning.jsx'
import './export-panel.css'

// ─── Modal progresso ZIP ──────────────────────────────────────────────────────
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

// ─── Modal progresso PDF ──────────────────────────────────────────────────────
function ExportPdfProgressModal({ open, current, total, estimatedMB, error, onClose }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const done = !error && current >= total && total > 0

  return (
    <Modal
      open={open}
      onClose={done || error ? onClose : undefined}
      title="Esportazione PDF"
      size="sm"
    >
      <div className="export-progress">
        {error ? (
          <>
            <div className="export-progress__label export-progress__label--error">{error}</div>
            <Button variant="ghost" size="sm" onClick={onClose} style={{ marginTop: 16 }}>
              Chiudi
            </Button>
          </>
        ) : (
          <>
            <div className="export-progress__label">
              {done
                ? 'PDF generato, download in corso…'
                : `Generazione slide ${current} di ${total}…`}
            </div>
            <div className="export-progress__bar-wrap">
              <div className="export-progress__bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="export-progress__pct">{pct}%</div>
            {estimatedMB && !done && (
              <div className="export-progress__size">Dimensione stimata: ~{estimatedMB} MB</div>
            )}
            {done && (
              <Button variant="primary" size="sm" onClick={onClose} style={{ marginTop: 16 }}>
                Chiudi
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Dropdown export ──────────────────────────────────────────────────────────
export function ExportPanel({ carousel, onExportJson }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [zipProgress, setZipProgress] = useState(null) // null | { current, total, label }
  const [pdfProgress, setPdfProgress] = useState(null) // null | { current, total, estimatedMB, error }
  const [showLandscapeWarning, setShowLandscapeWarning] = useState(false)
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

  function handleExportPdfClick() {
    setMenuOpen(false)
    const isLandscape = carousel.theme?.format === 'landscape'
    if (isLandscape) {
      setShowLandscapeWarning(true)
    } else {
      startPdfExport()
    }
  }

  async function startPdfExport() {
    const total = carousel.slides.length
    setPdfProgress({ current: 0, total, estimatedMB: null, error: null })
    try {
      await exportCarouselAsPdf(carousel, (current, tot, estimatedMB) => {
        setPdfProgress({ current, total: tot, estimatedMB, error: null })
      })
      toast('PDF esportato', 'success')
    } catch (err) {
      console.error('Export PDF fallito:', err)
      setPdfProgress((prev) => ({ ...prev, error: err.message ?? 'Errore durante la generazione del PDF' }))
    }
  }

  function handleExportJson() {
    setMenuOpen(false)
    onExportJson()
  }

  const isLandscape = carousel.theme?.format === 'landscape'

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
            <div className="export-panel__separator" />
            <button className="export-panel__item" onClick={handleExportPdfClick}>
              <FileText size={14} />
              Esporta PDF (LinkedIn)
              {isLandscape && (
                <AlertTriangle size={12} className="export-panel__item-warning" title="Formato landscape sconsigliato per LinkedIn" />
              )}
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

      {pdfProgress && (
        <ExportPdfProgressModal
          open
          current={pdfProgress.current}
          total={pdfProgress.total}
          estimatedMB={pdfProgress.estimatedMB}
          error={pdfProgress.error}
          onClose={() => setPdfProgress(null)}
        />
      )}

      {showLandscapeWarning && (
        <ExportPdfLandscapeWarning
          onCancel={() => setShowLandscapeWarning(false)}
          onConfirm={() => {
            setShowLandscapeWarning(false)
            startPdfExport()
          }}
        />
      )}
    </>
  )
}
