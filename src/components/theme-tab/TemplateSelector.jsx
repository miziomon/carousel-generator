import { TEMPLATES } from '../../slide-renderer/templates/registry.js'

/**
 * Trigger per la selezione del template: mostra il template corrente e, al click,
 * apre direttamente la TemplateManagerModal (Scenario 3 — no dropdown, no redundancy).
 *
 * @param {string}   currentId    — theme.template_id corrente
 * @param {Function} onOpenModal  — apre la TemplateManagerModal
 */
export function TemplateSelector({ currentId, onOpenModal }) {
  const current = TEMPLATES.find((t) => t.id === currentId) ?? TEMPLATES[0]

  return (
    <div className="palette-selector">
      <button
        type="button"
        className="palette-selector__trigger"
        onClick={onOpenModal}
        title="Scegli template"
      >
        <span className="palette-selector__trigger-name">{current?.name ?? '—'}</span>
        {current?.origin === 'system' && (
          <span className="palette-selector__badge palette-selector__badge--system">System</span>
        )}
      </button>
    </div>
  )
}
