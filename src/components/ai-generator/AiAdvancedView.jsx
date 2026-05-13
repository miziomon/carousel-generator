import ReactMarkdown from 'react-markdown'
import { SYSTEM_PROMPT_TEMPLATE } from '../../lib/ai/systemPrompt.js'
import { toast } from '../ui/Toast.jsx'

/**
 * Tab "Avanzate": visualizzazione read-only del system prompt in markdown.
 */
export function AiAdvancedView() {
  function handleCopy() {
    navigator.clipboard.writeText(SYSTEM_PROMPT_TEMPLATE).then(() => {
      toast('Prompt copiato')
    })
  }

  return (
    <div className="ai-advanced">
      <div className="ai-advanced__intro">
        <p>
          Questo è il prompt che istruisce l&apos;AI su come trasformare il tuo testo in carosello.
          È in sola lettura.
        </p>
      </div>

      <div className="ai-advanced__prompt-container">
        <ReactMarkdown>{SYSTEM_PROMPT_TEMPLATE}</ReactMarkdown>
      </div>

      <button
        type="button"
        className="ai-advanced__copy-btn"
        onClick={handleCopy}
      >
        Copia negli appunti
      </button>
    </div>
  )
}
