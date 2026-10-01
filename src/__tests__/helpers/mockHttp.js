/**
 * Mock HTTP condiviso dai test delle API.
 *
 * Sostituisce l'adapter di axios delle istanze `http` e `publicHttp`
 * (lib/http.js): le richieste attraversano per intero la pipeline reale
 * (interceptor, serializzazione del body, validateStatus) e si ferma solo
 * l'invio sulla rete. Le asserzioni parlano solo di richieste e risposte.
 *
 * Uso:
 *   const http = installHttpMock()
 *   http.respond({ status: 200, body: { ok: true } })   // risposta alla prossima richiesta
 *   http.networkError()                                  // simula backend irraggiungibile
 *   await qualcheChiamata()
 *   const req = http.lastRequest()
 *   req.url, req.method, req.header('authorization'), req.json(), req.formData
 *   http.uninstall()                                     // in afterEach
 */
import axios from 'axios'
import { http, publicHttp } from '../../lib/http.js'

export function installHttpMock() {
  const queue = []        // risposte (o errori) da servire in ordine
  const requests = []     // richieste ricevute
  const originals = [http.defaults.adapter, publicHttp.defaults.adapter]

  const adapter = async (config) => {
    const headers = {}
    for (const [k, v] of Object.entries(config.headers.toJSON())) headers[k.toLowerCase()] = v
    requests.push({
      url: axios.getUri(config),
      method: config.method.toUpperCase(),
      body: config.data,
      header: (name) => headers[name.toLowerCase()],
      json: () => (typeof config.data === 'string' ? JSON.parse(config.data) : config.data),
      get formData() { return config.data instanceof FormData ? config.data : null },
    })

    const next = queue.shift()
    if (!next) throw new Error(`mockHttp: nessuna risposta in coda per ${config.method} ${config.url}`)
    if (next.networkError) throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config)

    const { status, body } = next
    const response = {
      data: body === undefined ? '' : body,   // come axios con un body vuoto o non JSON
      status,
      statusText: String(status),
      headers: {},
      config,
      request: {},
    }
    // Stessa regola di settle() degli adapter reali
    const valid = config.validateStatus ? config.validateStatus(status) : status >= 200 && status < 300
    if (valid) return response
    throw new axios.AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
      config,
      response.request,
      response,
    )
  }

  http.defaults.adapter = adapter
  publicHttp.defaults.adapter = adapter

  return {
    respond: ({ status = 200, body } = {}) => { queue.push({ status, body }) },
    networkError: () => { queue.push({ networkError: true }) },
    requests,
    lastRequest: () => requests.at(-1),
    uninstall: () => {
      http.defaults.adapter = originals[0]
      publicHttp.defaults.adapter = originals[1]
    },
  }
}
