import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateCarousel } from '../lib/ai/generateCarousel.js'

// Mocka il modulo config per evitare di dipendere da import.meta.env in test
vi.mock('../lib/ai/config.js', () => ({
  getAiConfig: () => ({ url: 'https://api.example.com/v1/chat/completions', token: 'test-token' }),
  isAiConfigured: () => true,
}))

const MOCK_CAROUSEL = { slides: [{ type: 'cover', num: 1, font: 'archivo', size: 'cover', lines: ['Titolo'] }] }
const MOCK_RESPONSE_BODY = {
  response: JSON.stringify(MOCK_CAROUSEL),
  model: 'gemini-2.5-flash',
  usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
  json_repaired: 'none',
}

const BASE_PARAMS = {
  postText: 'Testo del post di prova da trasformare in carosello',
  slideCount: 10,
  extraInstructions: '',
  currentCarousel: { slides: [] },
  userId: 'user-123',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateCarousel', () => {
  it('200 OK — ritorna carousel, model, usage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_RESPONSE_BODY),
    }))

    const result = await generateCarousel(BASE_PARAMS)
    expect(result.carousel).toEqual(MOCK_CAROUSEL)
    expect(result.model).toBe('gemini-2.5-flash')
    expect(result.usage.total_tokens).toBe(300)
    expect(result.jsonRepaired).toBe('none')
  })

  it('body contiene force_json_response: true', async () => {
    let capturedBody
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE_BODY) })
    }))

    await generateCarousel(BASE_PARAMS)
    expect(capturedBody.force_json_response).toBe(true)
  })

  it('body contiene user_id quando passato', async () => {
    let capturedBody
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE_BODY) })
    }))

    await generateCarousel({ ...BASE_PARAMS, userId: 'u-abc' })
    expect(capturedBody.user_id).toBe('u-abc')
  })

  it('body contiene system_prompt e message', async () => {
    let capturedBody
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE_BODY) })
    }))

    await generateCarousel(BASE_PARAMS)
    expect(typeof capturedBody.system_prompt).toBe('string')
    expect(capturedBody.system_prompt.length).toBeGreaterThan(0)
    expect(capturedBody.message).toContain(BASE_PARAMS.postText.trim())
  })

  it('401 → ApiError UNAUTHORIZED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    }))

    await expect(generateCarousel(BASE_PARAMS)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('422 → ApiError JSON_VALIDATION_FAILED con payload', async () => {
    const body = { raw_response: 'garbage', error: 'JsonValidationFailed' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve(body),
    }))

    await expect(generateCarousel(BASE_PARAMS)).rejects.toMatchObject({
      code: 'JSON_VALIDATION_FAILED',
      payload: body,
    })
  })

  it('errore di rete → ApiError NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(generateCarousel(BASE_PARAMS)).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })

  it('message include [Numero target di slide] quando slideCount è un numero', async () => {
    let capturedBody
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE_BODY) })
    }))

    await generateCarousel({ ...BASE_PARAMS, slideCount: 8 })
    expect(capturedBody.message).toContain('[Numero target di slide: 8]')
  })

  it('message NON include [Numero target] quando slideCount è auto', async () => {
    let capturedBody
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      capturedBody = JSON.parse(opts.body)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE_BODY) })
    }))

    await generateCarousel({ ...BASE_PARAMS, slideCount: 'auto' })
    expect(capturedBody.message).not.toContain('Numero target')
  })
})
