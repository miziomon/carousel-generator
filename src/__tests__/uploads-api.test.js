import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installHttpMock } from './helpers/mockHttp.js'
import { uploadImage, listUploads, patchUpload } from '../lib/uploads/api.js'

// Sessione finta con token "tok-123" (l'integrazione vera con hub-auth è in http.test.js)
vi.mock('../auth.js', async () => ({
  hubAuth: (await import('./helpers/fakeHubAuth.js')).makeFakeHubAuth(),
}))

const USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

let http
beforeEach(() => { http = installHttpMock() })
afterEach(() => http.uninstall())

describe('uploadImage', () => {
  it('chiama POST /uploads con FormData e token Bearer', async () => {
    http.respond({
      status: 201,
      body: {
        id: 42,
        public_url: 'https://storage.example.com/media/abc.jpg',
        mime_type: 'image/jpeg',
        title: 'test',
        is_public: false,
        created_at: '2026-05-27T10:00:00+00:00',
      },
    })

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
    const result = await uploadImage({ file, userId: USER_ID, title: 'test' })

    const req = http.lastRequest()
    expect(req.url).toContain('uploads')
    expect(req.method).toBe('POST')
    expect(req.header('authorization')).toMatch(/^Bearer .+/)
    expect(req.formData).toBeInstanceOf(FormData)
    expect(result.public_url).toBe('https://storage.example.com/media/abc.jpg')
    expect(result.id).toBe(42)
  })

  it('non include is_public nel form se false (default)', async () => {
    http.respond({ status: 201, body: { id: 1, public_url: 'https://x.y/z.jpg', mime_type: 'image/jpeg', title: '', is_public: false, created_at: '' } })

    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' })
    await uploadImage({ file, userId: USER_ID })

    // is_public non deve essere presente per default
    expect(http.lastRequest().formData.get('is_public')).toBeNull()
  })

  it('include is_public=true nel form se richiesto', async () => {
    http.respond({ status: 201, body: { id: 2, public_url: 'https://x.y/z.jpg', mime_type: 'image/jpeg', title: '', is_public: true, created_at: '' } })

    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' })
    await uploadImage({ file, userId: USER_ID, isPublic: true })

    expect(http.lastRequest().formData.get('is_public')).toBe('true')
  })

  it('lancia errore con messaggio del backend per errori HTTP', async () => {
    http.respond({ status: 413, body: { message: 'File troppo grande' } })

    const file = new File(['data'], 'big.jpg', { type: 'image/jpeg' })
    await expect(uploadImage({ file, userId: USER_ID })).rejects.toThrow('File troppo grande')
  })

  it('usa fallback "Errore 500" se il backend non invia messaggio', async () => {
    http.respond({ status: 500, body: {} })

    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' })
    await expect(uploadImage({ file, userId: USER_ID })).rejects.toThrow('Errore 500')
  })
})

describe('listUploads', () => {
  it('chiama GET /uploads con user_id e type=image', async () => {
    http.respond({ body: { uploads: [], count: 0 } })

    await listUploads({ userId: USER_ID })

    const req = http.lastRequest()
    expect(req.method).toBe('GET')
    expect(req.url).toContain('uploads?')
    expect(req.url).toContain(`user_id=${USER_ID}`)
    expect(req.url).toContain('type=image')
    expect(req.header('authorization')).toMatch(/^Bearer .+/)
  })

  it('restituisce uploads e count', async () => {
    const mockUploads = [
      { id: 1, public_url: 'https://x.y/a.jpg', is_public: false, user_id: USER_ID },
      { id: 2, public_url: 'https://x.y/b.jpg', is_public: true,  user_id: USER_ID },
    ]
    http.respond({ body: { uploads: mockUploads, count: 2 } })

    const result = await listUploads({ userId: USER_ID })
    expect(result.uploads).toHaveLength(2)
    expect(result.count).toBe(2)
    expect(result.uploads[0].public_url).toBe('https://x.y/a.jpg')
  })
})

describe('patchUpload', () => {
  it('chiama PATCH /uploads/{id} con JSON e token Bearer', async () => {
    http.respond({ body: { id: 42, title: 'Nuovo titolo' } })

    await patchUpload(42, { userId: USER_ID, title: 'Nuovo titolo' })

    const req = http.lastRequest()
    expect(req.url).toContain('uploads/42')
    expect(req.method).toBe('PATCH')
    expect(req.header('content-type')).toBe('application/json')
    expect(req.header('authorization')).toMatch(/^Bearer .+/)

    const body = req.json()
    expect(body.user_id).toBe(USER_ID)
    expect(body.title).toBe('Nuovo titolo')
  })
})
