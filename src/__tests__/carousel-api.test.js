import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installHttpMock } from './helpers/mockHttp.js'
import { hubAuth } from '../auth.js'
import * as api from '../lib/carousel/api.js'

// BASE_URL è letta al caricamento di lib/http.js: va impostata prima degli import
vi.hoisted(() => { vi.stubEnv('VITE_API_BASE_URL', 'https://api.test/v1/') })

// Sessione finta: la sessione reale non serve (l'integrazione vera è in http.test.js)
vi.mock('../auth.js', async () => ({
  hubAuth: (await import('./helpers/fakeHubAuth.js')).makeFakeHubAuth(),
}))

const { getToken, handleUnauthorized } = hubAuth

let http
beforeEach(() => {
  http = installHttpMock()
  getToken.mockClear()
  handleUnauthorized.mockClear()
})
afterEach(() => http.uninstall())

const UID = 'user-1'

describe('carousel/api — richieste', () => {
  it('createCarousel: POST /carousel con JSON e Bearer', async () => {
    http.respond({ status: 201, body: { id: 5 } })
    const res = await api.createCarousel({ user_id: UID, title: 'T', content_json: { a: 1 }, thumbnail: null })
    const req = http.lastRequest()
    expect(req.method).toBe('POST')
    expect(req.url).toMatch(/\/carousel$/)
    expect(req.header('authorization')).toBe('Bearer tok-123')
    expect(req.header('content-type')).toBe('application/json')
    expect(req.json()).toEqual({ user_id: UID, title: 'T', content_json: { a: 1 }, thumbnail: null })
    expect(res).toEqual({ id: 5 })
  })

  it('updateCarousel: PUT /carousel/{id}?user_id=', async () => {
    http.respond({ body: { id: 5 } })
    await api.updateCarousel(5, UID, { title: 'T2', content_json: {}, thumbnail: 'x' })
    const req = http.lastRequest()
    expect(req.method).toBe('PUT')
    expect(req.url).toMatch(/\/carousel\/5\?user_id=user-1$/)
    expect(req.json()).toEqual({ title: 'T2', content_json: {}, thumbnail: 'x' })
  })

  it('patchCarousel: PATCH con body parziale', async () => {
    http.respond({ body: { id: 5, title: 'Nuovo' } })
    await api.patchCarousel(5, UID, { title: 'Nuovo' })
    const req = http.lastRequest()
    expect(req.method).toBe('PATCH')
    expect(req.json()).toEqual({ title: 'Nuovo' })
  })

  it('fetchCarousel: GET /carousel/{id}?user_id=', async () => {
    http.respond({ body: { id: 5 } })
    await api.fetchCarousel(5, UID)
    const req = http.lastRequest()
    expect(req.method).toBe('GET')
    expect(req.url).toMatch(/\/carousel\/5\?user_id=user-1$/)
  })

  it('deleteCarousel: DELETE; una risposta 204 diventa null', async () => {
    http.respond({ status: 204 })
    const res = await api.deleteCarousel(5, UID)
    expect(http.lastRequest().method).toBe('DELETE')
    expect(res).toBeNull()
  })

  it('listCarousels: costruisce la query con i default', async () => {
    http.respond({ body: { carousels: [], count: 0 } })
    await api.listCarousels({ user_id: UID })
    const url = new URL(http.lastRequest().url)
    expect(url.pathname).toMatch(/\/carousel$/)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      user_id: UID, sort: 'updated_at', order: 'desc', limit: '50', offset: '0',
    })
  })

  it('listCarousels: aggiunge search e ai_generated solo se presenti (false incluso)', async () => {
    http.respond({ body: {} })
    await api.listCarousels({ user_id: UID, search: 'ciao', ai_generated: false, limit: 10, offset: 20 })
    const params = new URL(http.lastRequest().url).searchParams
    expect(params.get('search')).toBe('ciao')
    expect(params.get('ai_generated')).toBe('false')
    expect(params.get('limit')).toBe('10')
    expect(params.get('offset')).toBe('20')
  })

  it('il token viene letto a ogni chiamata (non cachato al caricamento)', async () => {
    http.respond({ body: {} })
    http.respond({ body: {} })
    getToken.mockReturnValueOnce('primo').mockReturnValueOnce('secondo')
    await api.fetchCarousel(1, UID)
    await api.fetchCarousel(1, UID)
    expect(http.requests[0].header('authorization')).toBe('Bearer primo')
    expect(http.requests[1].header('authorization')).toBe('Bearer secondo')
  })
})

describe('carousel/api — errori', () => {
  it('usa message del backend e valorizza err.status', async () => {
    http.respond({ status: 404, body: { message: 'Non trovato' } })
    const err = await api.fetchCarousel(9, UID).catch((e) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Non trovato')
    expect(err.status).toBe(404)
  })

  it('ripiega su body.error', async () => {
    http.respond({ status: 400, body: { error: 'ValidationError' } })
    await expect(api.createCarousel({ user_id: UID })).rejects.toThrow('ValidationError')
  })

  it('ripiega su "Errore N" se il body non ha messaggi', async () => {
    http.respond({ status: 500, body: {} })
    await expect(api.fetchCarousel(1, UID)).rejects.toThrow('Errore 500')
  })

  it('ripiega su "Errore N" se il body non è JSON', async () => {
    http.respond({ status: 502 })
    await expect(api.fetchCarousel(1, UID)).rejects.toThrow('Errore 502')
  })

  it('401 notifica hubAuth.handleUnauthorized con il token usato e rilancia', async () => {
    http.respond({ status: 401, body: { message: 'Scaduta' } })
    const err = await api.fetchCarousel(1, UID).catch((e) => e)
    expect(handleUnauthorized).toHaveBeenCalledWith('tok-123')
    expect(err.status).toBe(401)
  })

  it('un errore di rete si propaga come eccezione', async () => {
    http.networkError()
    await expect(api.fetchCarousel(1, UID)).rejects.toThrow()
  })
})
