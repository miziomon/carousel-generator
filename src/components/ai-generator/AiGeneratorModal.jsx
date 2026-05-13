import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { AiGeneratorForm } from './AiGeneratorForm.jsx'
import { AiAdvancedView } from './AiAdvancedView.jsx'
import { AiLoadingStatus } from './AiLoadingStatus.jsx'
import { AiErrorDisplay } from './AiErrorDisplay.jsx'
import { AiConfirmReplaceModal } from './AiConfirmReplaceModal.jsx'
import { generateCarousel } from '../../lib/ai/generateCarousel.js'
import { validateCarouselForReplacement } from '../../lib/ai/validateGenerated.js'
import { ApiError } from '../../lib/ai/errors.js'
import { isAiConfigured } from '../../lib/ai/config.js'
import { toast } from '../ui/Toast.jsx'

/**
 * Modale "Genera carosello con AI".
 * La chiamata API NON viene interrotta se l'utente chiude il modale con la X —
 * il risultato viene semplicemente scartato. Lo stato locale si azzera all'unmount
 * perché il modale viene rimontato a ogni apertura.
 */
export function AiGeneratorModal({ open, onClose, paletteLibrary, carousel, userId, onReplaceFromAi }) {
  const [activeTab, setActiveTab]                 = useState('genera')
  const [postText, setPostText]                   = useState('')
  const [slideCount, setSlideCount]               = useState(12)
  const [extraInstructions, setExtraInstructions] = useState('')

  const [isGenerating, setIsGenerating]   = useState(false)
  const [generationError, setGenerationError] = useState(null)
  const [pendingResult, setPendingResult] = useState(null)

  const aiConfigured = isAiConfigured()
  const canGenerate  = aiConfigured && postText.trim().length > 0

  async function handleGenerate() {
    if (isGenerating) return
    setGenerationError(null)
    setIsGenerating(true)
    try {
      const result = await generateCarousel({
        postText,
        slideCount,
        extraInstructions,
        currentCarousel: carousel,
        userId,
      })
      const validation = validateCarouselForReplacement(result.carousel)
      if (!validation.ok) {
        throw new ApiError(
          'Il carosello generato non rispetta lo schema atteso',
          'SCHEMA_VALIDATION_FAILED',
          { zodErrors: validation.errors, generated: result.carousel }
        )
      }
      setPendingResult({
        carousel: validation.data,
        meta: {
          model: result.model,
          usage: result.usage,
          jsonRepaired: result.jsonRepaired,
          generationId: result.generationId,
          inputChars: postText.length,
        },
      })
    } catch (err) {
      setGenerationError(err)
    } finally {
      setIsGenerating(false)
    }
  }

  function confirmReplace() {
    onReplaceFromAi(pendingResult.carousel, pendingResult.meta)
    toast('Carosello generato. Ctrl+Z per annullare.', 'success')
    setPendingResult(null)
    onClose()
  }

  let generateTitle
  if (!aiConfigured) generateTitle = 'API non configurata. Verifica VITE_AI_API_URL e VITE_AI_API_TOKEN nel file .env'
  else if (!postText.trim()) generateTitle = 'Incolla il testo del post per procedere'

  return (
    <>
      <Modal open={open} onClose={onClose} title="Genera carosello con AI" size="lg">
        <div className="ai-modal">
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
                disabled={isGenerating}
              />
            )}
            {activeTab === 'avanzate' && <AiAdvancedView />}
          </div>

          {activeTab === 'genera' && generationError && (
            <AiErrorDisplay
              error={generationError}
              onRetry={handleGenerate}
              onDismiss={() => setGenerationError(null)}
            />
          )}

          {isGenerating && <AiLoadingStatus isGenerating={isGenerating} />}

          <div className="ai-modal__footer">
            <button
              type="button"
              className="ai-modal__btn-cancel"
              onClick={onClose}
              disabled={isGenerating}
            >
              Annulla
            </button>
            <button
              type="button"
              className={
                'ai-modal__btn-generate' +
                (!canGenerate || isGenerating ? ' ai-modal__btn-generate--disabled' : '') +
                (isGenerating ? ' ai-modal__btn-generate--loading' : '')
              }
              disabled={!canGenerate || isGenerating}
              onClick={handleGenerate}
              title={generateTitle}
            >
              {isGenerating ? (
                <>
                  <span className="ai-modal__spinner" aria-hidden="true" />
                  Generazione in corso…
                </>
              ) : (
                'Genera carosello'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {pendingResult && (
        <AiConfirmReplaceModal
          pendingResult={pendingResult}
          onConfirm={confirmReplace}
          onCancel={() => setPendingResult(null)}
        />
      )}
    </>
  )
}
