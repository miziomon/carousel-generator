import { describe, it, expect } from 'vitest'
import { ApiError, mapHttpErrorToApiError, RETRYABLE_CODES } from '../lib/ai/errors.js'

describe('ApiError', () => {
  it('è un Error con code e payload', () => {
    const err = new ApiError('messaggio', 'MY_CODE', { foo: 1 })
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('messaggio')
    expect(err.code).toBe('MY_CODE')
    expect(err.payload).toEqual({ foo: 1 })
  })

  it('accetta cause null', () => {
    const err = new ApiError('msg', 'CODE')
    expect(err.cause).toBeNull()
  })
})

describe('mapHttpErrorToApiError', () => {
  it('400 → BAD_REQUEST', () => {
    const err = mapHttpErrorToApiError(400, { error: 'ValidationError' })
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.message).toContain('non validi')
  })

  it('400 generico → BAD_REQUEST', () => {
    const err = mapHttpErrorToApiError(400, {})
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.message).toContain('non valida')
  })

  it('401 → UNAUTHORIZED', () => {
    const err = mapHttpErrorToApiError(401, null)
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.message).toContain('VITE_AI_API_TOKEN')
  })

  it('413 → PAYLOAD_TOO_LARGE', () => {
    const err = mapHttpErrorToApiError(413, null)
    expect(err.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('422 → JSON_VALIDATION_FAILED + payload', () => {
    const body = { raw_response: '...broken json...' }
    const err = mapHttpErrorToApiError(422, body)
    expect(err.code).toBe('JSON_VALIDATION_FAILED')
    expect(err.payload).toEqual(body)
  })

  it('429 → RATE_LIMITED', () => {
    const err = mapHttpErrorToApiError(429, null)
    expect(err.code).toBe('RATE_LIMITED')
  })

  it('500 ConfigError → SERVER_ERROR con messaggio configurazione', () => {
    const err = mapHttpErrorToApiError(500, { error: 'ConfigError' })
    expect(err.code).toBe('SERVER_ERROR')
    expect(err.message).toContain('configurazione')
  })

  it('500 generico → SERVER_ERROR', () => {
    const err = mapHttpErrorToApiError(500, {})
    expect(err.code).toBe('SERVER_ERROR')
  })

  it('503 → UNKNOWN_HTTP', () => {
    const err = mapHttpErrorToApiError(503, null)
    expect(err.code).toBe('UNKNOWN_HTTP')
    expect(err.message).toContain('503')
  })
})

describe('RETRYABLE_CODES', () => {
  it('include JSON_VALIDATION_FAILED', () => {
    expect(RETRYABLE_CODES.has('JSON_VALIDATION_FAILED')).toBe(true)
  })

  it('NON include UNAUTHORIZED', () => {
    expect(RETRYABLE_CODES.has('UNAUTHORIZED')).toBe(false)
  })

  it('NON include RATE_LIMITED', () => {
    expect(RETRYABLE_CODES.has('RATE_LIMITED')).toBe(false)
  })
})
