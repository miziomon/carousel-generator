import { CarouselSchema } from './schema.js'
import { migrateCarousel } from './migrations/migrateCarousel.js'

// Messaggi di errore zod → italiano
const ITALIAN_MESSAGES = {
  required_error: 'Campo obbligatorio',
  invalid_type: (expected, received) =>
    `Tipo non valido: atteso ${expected}, ricevuto ${received}`,
  too_small: (min, type) =>
    type === 'array'
      ? `Deve avere almeno ${min} elemento${min > 1 ? 'i' : ''}`
      : `Deve essere almeno ${min}`,
  too_big: (max, type) =>
    type === 'array'
      ? `Puo avere al massimo ${max} elemento${max > 1 ? 'i' : ''}`
      : `Deve essere al massimo ${max}`,
  invalid_enum_value: (options) => `Valore non valido. Opzioni: ${options.join(', ')}`,
  invalid_literal: (expected) => `Deve essere ${JSON.stringify(expected)}`,
  unrecognized_keys: (keys) => `Chiavi non riconosciute: ${keys.join(', ')}`,
}

function issueToItalian(issue) {
  switch (issue.code) {
    case 'invalid_type':
      return ITALIAN_MESSAGES.invalid_type(issue.expected, issue.received)
    case 'too_small':
      return issue.message || ITALIAN_MESSAGES.too_small(issue.minimum, issue.type)
    case 'too_big':
      return issue.message || ITALIAN_MESSAGES.too_big(issue.maximum, issue.type)
    case 'invalid_enum_value':
      return ITALIAN_MESSAGES.invalid_enum_value(issue.options ?? [])
    case 'invalid_literal':
      return ITALIAN_MESSAGES.invalid_literal(issue.expected)
    case 'unrecognized_keys':
      return ITALIAN_MESSAGES.unrecognized_keys(issue.keys ?? [])
    case 'custom':
      return issue.message
    default:
      return issue.message || 'Valore non valido'
  }
}

/**
 * Valida un oggetto JSON raw contro lo schema del carosello.
 * La migrazione viene applicata PRIMA della validazione Zod,
 * cosi i JSON in formato vecchio (5 colori, nessun palette_id)
 * vengono accettati e aggiornati automaticamente.
 *
 * @returns {{ ok: true, data: object } | { ok: false, errors: Array<{path: string, message: string}> }}
 */
export function validateJson(raw) {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: [{ path: '(root)', message: 'Il JSON deve essere un oggetto' }] }
  }

  // Migrazione prima di Zod — tollerante all'input malformato
  const migrated = migrateCarousel(raw)

  const result = CarouselSchema.safeParse(migrated)

  if (result.success) {
    return { ok: true, data: result.data }
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issueToItalian(issue),
  }))

  return { ok: false, errors }
}
