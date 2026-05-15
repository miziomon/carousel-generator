import { useState, useEffect, useRef } from 'react'
import { Upload, Undo2, Redo2, FilePlus, Monitor, Smartphone, Plus, ChevronDown, Sparkles, Save, FolderOpen, PanelLeft } from 'lucide-react'
import '../theme-sidebar/theme-sidebar.css'
import { Button } from '../ui/Button.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { ExportPanel } from '../export-panel/ExportPanel.jsx'
import '../ai-generator/ai-generator.css'
import { toast } from '../ui/Toast.jsx'
import { validateJson } from '../../lib/validateJson.js'
import { slugifyTitle } from '../../lib/filename.js'
import { UserMenu } from './UserMenu.jsx'
import { SyncIndicator } from './SyncIndicator.jsx'
import pkg from '../../../package.json'
import './header.css'

const SLIDE_TYPES = [
  { id: 'cover',    label: 'Cover' },
  { id: 'standard', label: 'Standard' },
  { id: 'divider',  label: 'Divisore' },
  { id: 'quote',    label: 'Citazione' },
  { id: 'cta',      label: 'Call to action' },
]


export function Header({
  carousel,
  meta,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onLoadCarousel,
  onNewProject,
  onAddSlide,
  onUpdateTitle,
  onUpdateAuthor,
  mobileView,
  onToggleMobileView,
  onOpenAiGenerator,
  sidebarOpen,
  onToggleSidebar,
  auth,
  // DB save/open
  onSaveCarousel,
  onOpenLibrary,
  onSaveNow,
  canSave,
  canOpen,
}) {
  const [showNewConfirm, setShowNewConfirm] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef(null)
  const fileInputRef = useRef(null)

  // Chiude il dropdown "Aggiungi" se si clicca fuori
  useEffect(() => {
    if (!addMenuOpen) return
    function handleClick(e) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [addMenuOpen])

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
    a.download = `${slugifyTitle(carousel.title)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('JSON esportato', 'success')
  }

  function handleAddType(type) {
    setAddMenuOpen(false)
    onAddSlide(type)
  }

  return (
    <>
      <header className="header">
        {/* Logo + versione */}
        <span className="header__logo">
          Carousel Generator
          <span className="header__version">v{pkg.version}</span>
        </span>

        {/* Toggle sidebar Tema */}
        <button
          type="button"
          className={`header__sidebar-toggle${sidebarOpen ? ' header__sidebar-toggle--active' : ''}`}
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Chiudi pannello Tema (Ctrl+B)' : 'Apri pannello Tema (Ctrl+B)'}
          aria-label="Toggle pannello Tema"
        >
          <PanelLeft size={15} />
        </button>

        <div className="header__separator" />

        {/* Nome progetto e autore — editabili indipendentemente */}
        <div className="header__identity">
          <input
            className="header__field"
            value={carousel.title ?? ''}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="Nome progetto"
            title="Nome del progetto"
            spellCheck={false}
          />
          <span className="header__identity-sep">/</span>
          <input
            className="header__field header__field--author"
            value={carousel.theme?.footer?.name ?? ''}
            onChange={(e) => onUpdateAuthor(e.target.value)}
            placeholder="Autore"
            title="Nome autore (appare nel footer delle slide)"
            spellCheck={false}
          />
        </div>

        <div className="header__spacer" />

        <div className="header__actions">
          <Button variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} title="Annulla (Ctrl+Z)">
            <Undo2 size={16} />
          </Button>
          <Button variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} title="Ripristina (Ctrl+Shift+Z)">
            <Redo2 size={16} />
          </Button>

          <div className="header__separator" />

          {/* M9: toggle Desktop / Mobile */}
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

          {/* Nuovo progetto */}
          <Button variant="ghost" size="sm" onClick={() => setShowNewConfirm(true)} title="Nuovo progetto">
            <FilePlus size={14} />
            Nuovo
          </Button>

          {/* Genera con AI — azione secondaria rispetto ad Aggiungi slide */}
          <button
            type="button"
            className="btn-generate-ai"
            onClick={onOpenAiGenerator}
            title="Genera un carosello a partire da un testo con l'AI"
          >
            <Sparkles size={14} className="btn-generate-ai__icon" aria-hidden="true" />
            <span className="btn-generate-ai__label">Genera con AI</span>
          </button>

          {/* Aggiungi slide — dropdown */}
          <div className="header__add-slide" ref={addMenuRef}>
            {addMenuOpen && (
              <div className="header__add-menu">
                {SLIDE_TYPES.map((t) => (
                  <button key={t.id} className="header__add-menu-item" onClick={() => handleAddType(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddMenuOpen((v) => !v)}
              title="Aggiungi una nuova slide"
            >
              <Plus size={14} />
              Aggiungi slide
              <ChevronDown size={11} style={{ opacity: 0.7 }} />
            </Button>
          </div>

          <div className="header__separator" />

          <Button variant="ghost" size="sm" onClick={handleImportClick} title="Importa JSON">
            <Upload size={14} />
            Importa
          </Button>

          <ExportPanel carousel={carousel} onExportJson={handleExportJson} />

          <div className="header__separator" />

          {/* Bottoni cloud — visibili solo se loggato */}
          {auth?.isLoggedIn && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenLibrary}
                disabled={!canOpen}
                title={canOpen ? 'Apri un carosello salvato' : 'Accedi per accedere ai tuoi caroselli'}
              >
                <FolderOpen size={14} />
                Apri
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onSaveCarousel}
                disabled={!canSave}
                title={canSave ? 'Salva il carosello corrente nel cloud' : 'Accedi per salvare'}
              >
                <Save size={14} />
                Salva
              </Button>
            </>
          )}

          <SyncIndicator meta={meta} onSaveNow={meta.documentId && meta.isDirty ? onSaveNow : null} />

          {auth?.isLoggedIn && (
            <>
              <div className="header__separator" />
              <UserMenu
                user={auth.user}
                onOpenLibrary={onOpenLibrary}
                onLogout={() => { auth.logout(); toast('Logout effettuato', 'success') }}
              />
            </>
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
