import { describe, it, expect, beforeEach, vi } from 'vitest'
import { uploadImage, listUploads, patchUpload } from '../lib/uploads/api.js'

const USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

describe('uploadImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('chiama POST /uploads con FormData e token Bearer', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 42,
        public_url: 'https://storage.example.com/media/abc.jpg',
        mime_type: 'image/jpeg',
        title: 'test',
        is_public: false,
        created_at: '2026-05-27T10:00:00+00:00',
      }),
    })

    const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
    const result = await uploadImage({ file, userId: USER_ID, title: 'test' })

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('uploads')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toMatch(/^Bearer .+/)
    expect(options.body).toBeInstanceOf(FormData)
    expect(result.public_url).toBe('https://storage.example.com/media/abc.jpg')
    expect(result.id).toBe(42)
  })

  it('non include is_public nel form se false (default)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, public_url: 'https://x.y/z.jpg', mime_type: 'image/jpeg', title: '', is_public: false, created_at: '' }),
    })

    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' })
    await uploadImage({ file, userId: USER_ID })

    const formData = vi.mocked(fetch).mock.calls[0][1].body
    // is_public non deve essere presente per default
    expect(formData.get('is_public')).toBeNull()
  })

  it('include is_public=true nel form se richiesto', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 2, public_url: 'https://x.y/z.jpg', mime_type: 'image/jpeg', title: '', is_public: true, created_at: '' }),
    })

    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' })
    await uploadImage({ file, userId: USER_ID, isPublic: true })

    const formData = vi.mocked(fetch).mock.calls[0][1].body
    expect(formData.get('is_public')).toBe('true')
  })

  it('lancia errore con messaggio del backend per errori HTTP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: async () => ({ message: 'File troppo grande' }),
    })

    const file = new File(['data'], 'big.jpg', { type: 'image/jpeg' })
    await expect(uploadImage({ file, userId: USER_ID })).rejects.toThrow('File troppo grande')
  })

  it('usa fallback "Errore 500" se il backend non invia messaggio', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' })
    await expect(uploadImage({ file, userId: USER_ID })).rejects.toThrow('Errore 500')
  })
})

describe('listUploads', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('chiama GET /uploads con user_id e type=image', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ uploads: [], count: 0 }),
    })

    await listUploads({ userId: USER_ID })

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('uploads?')
    expect(url).toContain(`user_id=${USER_ID}`)
    expect(url).toContain('type=image')
    expect(options.headers.Authorization).toMatch(/^Bearer .+/)
  })

  it('restituisce uploads e count', async () => {
    const mockUploads = [
      { id: 1, public_url: 'https://x.y/a.jpg', is_public: false, user_id: USER_ID },
      { id: 2, public_url: 'https://x.y/b.jpg', is_public: true,  user_id: USER_ID },
    ]
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ uploads: mockUploads, count: 2 }),
    })

    const result = await listUploads({ userId: USER_ID })
    expect(result.uploads).toHaveLength(2)
    expect(result.count).toBe(2)
    expect(result.uploads[0].public_url).toBe('https://x.y/a.jpg')
  })
})

describe('patchUpload', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('chiama PATCH /uploads/{id} con JSON e token Bearer', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 42, title: 'Nuovo titolo' }),
    })

    await patchUpload(42, { userId: USER_ID, title: 'Nuovo titolo' })

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('uploads/42')
    expect(options.method).toBe('PATCH')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers.Authorization).toMatch(/^Bearer .+/)

    const body = JSON.parse(options.body)
    expect(body.user_id).toBe(USER_ID)
    expect(body.title).toBe('Nuovo titolo')
  })
})
