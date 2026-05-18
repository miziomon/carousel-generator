import { Modal } from '../ui/Modal.jsx'
import './app-preferences-modal.css'

const THEME_OPTIONS = [
  { value: 'auto', label: 'Automatico', desc: 'Segue il sistema operativo' },
  { value: 'dark', label: 'Scuro', desc: 'Sfondo scuro con testo chiaro' },
  { value: 'light', label: 'Chiaro', desc: 'Sfondo carta con testo scuro' },
]

export function AppPreferencesModal({ open, onClose, preference, onSetTheme }) {
  return (
    <Modal open={open} onClose={onClose} title="Preferenze" size="sm">
      <div className="app-prefs">
        <div className="app-prefs__section">
          <div className="app-prefs__section-label">Tema colori</div>
          <div className="app-prefs__theme-grid">
            {THEME_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                className={[
                  'app-prefs__theme-btn',
                  preference === value ? 'app-prefs__theme-btn--active' : '',
                ].join(' ')}
                onClick={() => onSetTheme(value)}
              >
                <span className="app-prefs__theme-swatch" data-theme-value={value} />
                <span className="app-prefs__theme-label">{label}</span>
                <span className="app-prefs__theme-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
