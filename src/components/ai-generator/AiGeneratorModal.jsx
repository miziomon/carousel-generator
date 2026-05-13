import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { AiGeneratorForm } from './AiGeneratorForm.jsx'
import { AiAdvancedView } from './AiAdvancedView.jsx'

/**
 * Modale "Genera carosello con AI" — solo scaffolding UI.
 * Lo stato del form è locale e viene scartato a ogni chiusura (il componente è unmountato
 * quando open=false, quindi non serve reset esplicito).
 *
 * @param {boolean}  open           — visibilità modale
 * @param {Function} onClose        — chiudi modale
 * @param {Array}    paletteLibrary — usato per il placeholder N del banner few-shot
 */
export function AiGeneratorModal({ open, onClose, paletteLibrary }) {
  const [activeTab, setActiveTab]               = useState('genera')
  const [postText, setPostText]                 = useState('')
  const [slideCount, setSlideCount]             = useState(12)  // number | 'auto'
  const [extraInstructions, setExtraInstructions] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="Genera carosello con AI" size="lg">
      <div className="ai-modal">
        {/* Tab interne */}
        <div className="ai-modal__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'genera'}
            className={'ai-modal__tab' + (activeTab === 'genera' ? ' ai-modal__tab--active' : '')}
            onClick={() => setActiveTab('genera')}
          >
            Genera
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'avanzate'}
            className={'ai-modal__tab' + (activeTab === 'avanzate' ? ' ai-modal__tab--active' : '')}
            onClick={() => setActiveTab('avanzate')}
          >
            Avanzate
          </button>
        </div>

        {/* Contenuto della tab attiva — scroll controllato internamente */}
        <div className="ai-modal__tab-content">
          {activeTab === 'genera' && (
            <AiGeneratorForm
              postText={postText}
              onPostTextChange={setPostText}
              slideCount={slideCount}
              onSlideCountChange={setSlideCount}
              extraInstructions={extraInstructions}
              onExtraChange={setExtraInstructions}
              paletteCount={paletteLibrary.length}
            />
          )}
          {activeTab === 'avanzate' && <AiAdvancedView />}
        </div>

        {/* Footer — sempre visibile sotto il contenuto scrollabile */}
        <div className="ai-modal__footer">
          <button
            type="button"
            className="ai-modal__btn-cancel"
            onClick={onClose}
          >
            Annulla
          </button>
          <button
            type="button"
            className="ai-modal__btn-generate ai-modal__btn-generate--disabled"
            disabled
            title="Generazione AI in arrivo nella prossima versione"
          >
            Genera carosello
          </button>
        </div>
      </div>
    </Modal>
  )
}
