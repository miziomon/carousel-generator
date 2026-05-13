import { useState } from 'react'
import { RETRYABLE_CODES } from '../../lib/ai/errors.js'

export function AiErrorDisplay({ error, onRetry, onDismiss }) {
  const [expanded, setExpanded] = useState(false)

  if (!error) return null

  const isRetryable = RETRYABLE_CODES.has(error.code)
  const hasDetails = ['UNAUTHORIZED', 'BAD_REQUEST', 'JSON_VALIDATION_FAILED',
    'SCHEMA_VALIDATION_FAILED', 'SERVER_ERROR', 'NETWORK_ERROR',
    'INVALID_JSON_RESPONSE', 'UNKNOWN_HTTP'].includes(error.code)

  return (
    <div className="ai-modal__error">
      <div className="ai-modal__error-header">
        <span className="ai-modal__error-icon">⚠</span>
        <span className="ai-modal__error-message">{error.message}</span>
        <button className="ai-modal__error-dismiss" onClick={onDismiss} title="Chiudi">×</button>
      </div>

      {hasDetails && (
        <details
          className="ai-modal__error-details"
          open={expanded}
          onToggle={(e) => setExpanded(e.target.open)}
        >
          <summary className="ai-modal__error-summary">Mostra dettagli tecnici</summary>
          <div className="ai-modal__error-body">
            <div className="ai-modal__error-code">Codice: {error.code}</div>

            {error.code === 'JSON_VALIDATION_FAILED' && error.payload?.raw_response && (
              <pre className="ai-modal__error-raw">{error.payload.raw_response}</pre>
            )}

            {error.code === 'SCHEMA_VALIDATION_FAILED' && (
              <>
                <div className="ai-modal__error-zod-list">
                  {(error.payload?.zodErrors ?? []).map((e, i) => (
                    <div key={i} className="ai-modal__error-zod-item">
                      <code>{e.path || '(root)'}</code>: {e.message}
                    </div>
                  ))}
                </div>
                {error.payload?.generated && (
                  <pre className="ai-modal__error-raw">
                    {JSON.stringify(error.payload.generated, null, 2)}
                  </pre>
                )}
              </>
            )}

            {error.code === 'NETWORK_ERROR' && error.cause && (
              <div className="ai-modal__error-cause">{error.cause.message}</div>
            )}

            {!['JSON_VALIDATION_FAILED', 'SCHEMA_VALIDATION_FAILED', 'NETWORK_ERROR'].includes(error.code)
              && error.payload && (
              <pre className="ai-modal__error-raw">{JSON.stringify(error.payload, null, 2)}</pre>
            )}
          </div>
        </details>
      )}

      {isRetryable && onRetry && (
        <button className="ai-modal__error-retry" onClick={onRetry}>
          Riprova
        </button>
      )}
    </div>
  )
}
