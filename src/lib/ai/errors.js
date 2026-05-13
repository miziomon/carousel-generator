export class ApiError extends Error {
  constructor(message, code, payload = null, cause = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.payload = payload
    this.cause = cause
  }
}

export function mapHttpErrorToApiError(status, body) {
  switch (status) {
    case 400:
      return new ApiError(
        body?.error === 'ValidationError' ? 'Dati della richiesta non validi' : 'Richiesta non valida',
        'BAD_REQUEST',
        body
      )
    case 401:
      return new ApiError(
        'Token di autenticazione non valido. Verifica VITE_API_AUTH_TOKEN nel file .env',
        'UNAUTHORIZED',
        body
      )
    case 413:
      return new ApiError(
        'Testo troppo grande per essere processato',
        'PAYLOAD_TOO_LARGE',
        body
      )
    case 422:
      return new ApiError(
        'Il modello AI ha generato una risposta non valida. Riprova.',
        'JSON_VALIDATION_FAILED',
        body
      )
    case 429:
      return new ApiError(
        'Hai generato troppi caroselli in poco tempo. Riprova tra un minuto.',
        'RATE_LIMITED',
        body
      )
    case 500:
      return new ApiError(
        body?.error === 'ConfigError'
          ? 'Errore di configurazione del backend AI'
          : 'Errore interno del servizio AI',
        'SERVER_ERROR',
        body
      )
    default:
      return new ApiError(`Errore HTTP ${status}`, 'UNKNOWN_HTTP', body)
  }
}

export const RETRYABLE_CODES = new Set([
  'JSON_VALIDATION_FAILED',
  'SCHEMA_VALIDATION_FAILED',
  'SERVER_ERROR',
  'NETWORK_ERROR',
  'INVALID_JSON_RESPONSE',
  'UNKNOWN_HTTP',
])
