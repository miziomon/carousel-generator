/**
 * Finto hubAuth per i test delle API: espone solo ciò che usa l'app
 * (getToken, handleUnauthorized, installAxiosInterceptors), con spy per le asserzioni.
 *
 * installAxiosInterceptors replica la logica degli interceptor reali della
 * libreria (Bearer letto a ogni richiesta, 401 → handleUnauthorized col token
 * usato); l'integrazione con la libreria vera è coperta da http.test.js.
 *
 * Uso nei test (il file non importa nulla dall'app, così non crea cicli):
 *   vi.mock('../auth.js', async () => ({
 *     hubAuth: (await import('./helpers/fakeHubAuth.js')).makeFakeHubAuth(),
 *   }))
 */
import { vi } from 'vitest'

const bearerOf = (header) =>
  typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null

export function makeFakeHubAuth({ token = 'tok-123' } = {}) {
  const getToken = vi.fn(() => token)
  const handleUnauthorized = vi.fn()

  return {
    getToken,
    handleUnauthorized,
    installAxiosInterceptors(instance) {
      instance.interceptors.request.use((cfg) => {
        const current = getToken()
        if (current && !cfg.headers.get('Authorization')) {
          cfg.headers.set('Authorization', `Bearer ${current}`)
        }
        return cfg
      })
      instance.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error?.response?.status === 401) {
            handleUnauthorized(bearerOf(error.config?.headers?.get?.('Authorization')))
          }
          return Promise.reject(error)
        },
      )
    },
  }
}
