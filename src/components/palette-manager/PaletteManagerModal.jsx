import { useState, useRef } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { PaletteRow } from './PaletteRow.jsx'
import { PaletteEditModal } from './PaletteEditModal.jsx'
import { exportPalette } from '../../lib/palettes/exportPalette.js'
import { parseImportedPalette } from '../../lib/palettes/importPalette.js'
import { toast } from '../ui/Toast.jsx'
import { motion } from 'framer-motion'
import './palette-manager.css'

/**
 * Modal principale per la gestione della libreria palette.
 * Mostra palette system (read-only) e palette utente (CRUD completo).
 * Le palette system non possono essere modificate o eliminate.
 */
export function PaletteManagerModal({
  open,
  onClose,
  paletteLibrary,
  applyPalette,
  createPalette,
  updatePalette,
  duplicatePalette,
  deletePalette,
  importPalette,
}) {
  const [editMode, setEditMode]         = useState(null)
  const [editTarget, setEditTarget]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importError, setImportError]   = useState('')
  const importInputRef = useRef(null)

  const systemPalettes = paletteLibrary.filter((p) => p.origin === 'system')
  const userPalettes   = paletteLibrary.filter((p) => p.origin === 'user')

  function handleApply(paletteId) {
    applyPalette(paletteId)
    // Notifica l'utente della palette applicata prima di chiudere
    const palette = paletteLibrary.find((p) => p.id === paletteId)
    toast(`Palette "${palette?.name}" applicata`)
    onClose()
  }

  function handleDuplicateOpen(paletteId) {
    const palette = paletteLibrary.find((p) => p.id === paletteId)
    setEditTarget(palette)
    setEditMode('duplicate')
  }

  function handleEdit(paletteId) {
    const palette = paletteLibrary.find((p) => p.id === paletteId)
    setEditTarget(palette)
    setEditMode('edit')
  }

  function handleCreateNew() {
    setEditTarget(null)
    setEditMode('create')
  }

  function handleEditSave(formData) {
    if (editMode === 'create' || editMode === 'duplicate') {
      createPalette(formData)
      toast(`Palette "${formData.name}" creata`)
    } else if (editMode === 'edit' && editTarget) {
      updatePalette(editTarget.id, formData)
      toast(`Palette "${formData.name}" aggiornata`)
    }
    setEditMode(null)
    setEditTarget(null)
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      deletePalette(deleteTarget.id)
      // Informa che i colori rimangono nel carosello anche dopo l'eliminazione
      toast(`Palette "${deleteTarget.name}" eliminata. Il carosello mantiene i colori correnti.`)
    }
    setDeleteTarget(null)
  }

  function handleExport(paletteId) {
    const palette = paletteLibrary.find((p) => p.id === paletteId)
    if (palette) {
      exportPalette(palette)
      toast(`Palette "${palette.name}" esportata`)
    }
  }

  function handleImportClick() {
    setImportError('')
    importInputRef.current?.click()
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result)
        const result = parseImportedPalette(raw)
        if (!result.ok) { setImportError(result.error); return }
        importPalette(result.palette)
        // Toast di conferma con il nome della palette appena importata
        toast(`Palette "${result.palette.name}" importata`)
        setImportError('')
      } catch {
        setImportError('File JSON non valido — impossibile fare il parsing.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Gestisci palette" size="lg">
        {/* fade-in del contenuto all'apertura del modal */}
        <motion.div
          className="palette-manager"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="palette-manager__toolbar">
            <Button size="sm" variant="primary" onClick={handleCreateNew}>
              + Nuova palette
            </Button>
            <Button size="sm" variant="ghost" onClick={handleImportClick}>
              Importa palette...
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            {importError && (
              <span className="palette-manager__import-error">{importError}</span>
            )}
          </div>

          <div className="palette-manager__section">
            <h4 className="palette-manager__section-header">Palette di sistema</h4>
            {systemPalettes.map((p) => (
              <PaletteRow
                key={p.id}
                palette={p}
                onApply={handleApply}
                onDuplicate={handleDuplicateOpen}
                onEdit={handleEdit}
                onExport={handleExport}
                onDelete={(id) => setDeleteTarget(paletteLibrary.find((x) => x.id === id))}
              />
            ))}
          </div>

          <div className="palette-manager__section">
            <h4 className="palette-manager__section-header">Le mie palette</h4>
            {userPalettes.length === 0 ? (
              <p className="palette-manager__empty">
                Nessuna palette personalizzata. Crea una nuova palette o duplica una di sistema.
              </p>
            ) : (
              userPalettes.map((p) => (
                <PaletteRow
                  key={p.id}
                  palette={p}
                  onApply={handleApply}
                  onDuplicate={handleDuplicateOpen}
                  onEdit={handleEdit}
                  onExport={handleExport}
                  onDelete={(id) => setDeleteTarget(paletteLibrary.find((x) => x.id === id))}
                />
              ))
            )}
          </div>
        </motion.div>
      </Modal>

      <PaletteEditModal
        open={editMode !== null}
        mode={editMode ?? 'create'}
        initialData={editTarget}
        onSave={handleEditSave}
        onClose={() => { setEditMode(null); setEditTarget(null) }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Elimina palette"
        message={"Vuoi eliminare la palette \"" + (deleteTarget?.name ?? '') + "\"? Se applicata al carosello, i colori rimarranno ma il collegamento verra' rimosso."}
        confirmLabel="Elimina"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
