import { Modal } from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { TEMPLATES } from '../../slide-renderer/templates/registry.js'
import './template-manager.css'

/**
 * Modal per la visualizzazione dei template di sistema.
 * I template sono code-only: nessun CRUD utente.
 *
 * @param {boolean}  open           — visibilità modale
 * @param {Function} onClose        — chiudi modale
 * @param {string}   currentId      — theme.template_id corrente
 * @param {Function} onApply        — callback(templateId) — applica template
 */
export function TemplateManagerModal({ open, onClose, currentId, onApply }) {
  function handleApply(templateId) {
    onApply(templateId)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Template" size="md">
      <div className="tmpl-manager">
        <p className="tmpl-manager__intro">
          I template definiscono il layout e lo stile visivo delle slide.
          Cambiare template non modifica il contenuto, ma può richiedere
          una palette diversa per risultati ottimali.
        </p>

        <div className="tmpl-manager__list">
          {TEMPLATES.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              active={t.id === currentId}
              onApply={handleApply}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}

function TemplateRow({ template, active, onApply }) {
  return (
    <div className={'tmpl-manager__row' + (active ? ' tmpl-manager__row--active' : '')}>
      <div className="tmpl-manager__row-info">
        <div className="tmpl-manager__row-header">
          <span className="tmpl-manager__row-name">{template.name}</span>
          {active && <span className="tmpl-manager__badge">Attivo</span>}
          <span className="tmpl-manager__badge tmpl-manager__badge--system">System</span>
        </div>
        {template.description && (
          <p className="tmpl-manager__row-desc">{template.description}</p>
        )}
      </div>
      <Button
        size="sm"
        variant={active ? 'ghost' : 'primary'}
        disabled={active}
        onClick={() => onApply(template.id)}
      >
        {active ? 'Attivo' : 'Applica'}
      </Button>
    </div>
  )
}
