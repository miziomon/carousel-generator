import { useState, useEffect, useRef } from 'react'
import { Upload, Undo2, Redo2, FilePlus, Monitor, Smartphone } from 'lucide-react'
import { Button } from '../ui/Button.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { ExportPanel } from '../export-panel/ExportPanel.jsx'
import { toast } from '../ui/Toast.jsx'
import { validateJson } from '../../lib/validateJson.js'
import './header.css'

function formatSavedAgo(ts) {
  if (!ts) return null
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 5) return 'Salvato ora'
  if (seconds < 60) return `Salvato ${seconds}s fa`
  const minutes = Math.floor(seconds / 60)
  return `Salvato ${minutes}m fa`
}

export function Header({
  carousel,
  meta,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onLoadCarousel,
  onNewProject,
  mobileView,
  onToggleMobileView,
}) {
  const [savedLabel, setSavedLabel] = useState(null)
  const [showNewConfirm, setShowNewConfirm] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setSavedLabel(formatSavedAgo(meta.lastSavedAt))
    const interval = setInterval(() => setSavedLabel(formatSavedAgo(meta.lastSavedAt)), 5000)
    return () => clearInterval(interval)
  }, [meta.lastSavedAt])

  useEffect(() => {
    setSavedLabel(formatSavedAgo(meta.lastSavedAt))
  }, [meta.lastSavedAt])

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result)
        const result = validateJson(raw)
        if (result.ok) {
          onLoadCarousel(result.data)
          toast('JSON importato con successo', 'success')
        } else {
          const msgs = result.errors.slice(0, 3).map((e) => `• ${e.path}: ${e.message}`).join('\n')
          toast(`Errori nel JSON:\n${msgs}`, 'error')
        }
      } catch {
        toast('File JSON non valido', 'error')
      }
    }
    reader.readAsText(file)
  }

  function handleExportJson() {
    const clean = {
      ...carousel,
      slides: carousel.slides.map(({ id: _id, ...rest }) => rest),
    }
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'carosello.json'
    a.click()
    URL.revokeObjectURL(url)
    toast('JSON esportato', 'success')
  }

  const projectName = carousel.theme?.footer?.name || 'Carosello'

  return (
    <>
      <header className="header">
        <span className="header__logo">Carosello Builder</span>
        <div className="header__separator" />
        <span className="header__project-name" title="Nome progetto (dal footer.name del tema)">
          {projectName}
        </span>
        <div className="header__spacer" />

        <div className="header__actions">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canUndo}
            onClick={onUndo}
            title="Annulla (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canRedo}
            onClick={onRedo}
            title="Ripristina (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </Button>

          <div className="header__separator" />

          {/* M9: toggle Desktop / Mobile view */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileView}
            title={mobileView ? 'Vista desktop' : 'Vista mobile'}
            className={mobileView ? 'header__btn--active' : ''}
          >
            {mobileView ? <Monitor size={16} /> : <Smartphone size={16} />}
          </Button>

          <div className="header__separator" />

          <Button variant="ghost" size="sm" onClick={() => setShowNewConfirm(true)} title="Nuovo progetto">
            <FilePlus size={14} />
            Nuovo
          </Button>
          <Button variant="ghost" size="sm" onClick={handleImportClick} title="Importa JSON">
            <Upload size={14} />
            Importa
          </Button>

          <ExportPanel carousel={carousel} onExportJson={handleExportJson} />

          {savedLabel && <span className="header__saved">{savedLabel}</span>}
          {meta.isDirty && !meta.lastSavedAt && (
            <span className="header__saved" style={{ color: 'rgba(0,255,170,0.4)' }}>Non salvato</span>
          )}
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <ConfirmDialog
        open={showNewConfirm}
        title="Nuovo progetto"
        message="Le modifiche non salvate andranno perse. Vuoi continuare?"
        confirmLabel="Nuovo progetto"
        confirmVariant="danger"
        onConfirm={() => { setShowNewConfirm(false); onNewProject() }}
        onCancel={() => setShowNewConfirm(false)}
      />
    </>
  )
}
