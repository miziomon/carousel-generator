import axios from 'axios'
import { hubAuth } from '../auth.js'

const BASE = import.meta.env.VITE_API_BASE_URL

/**
 * Client HTTP autenticato verso il backend hub.
 * Gli interceptor di hub-auth aggiungono il Bearer della sessione corrente a
 * ogni richiesta (letto al momento della chiamata) e, su 401, notificano
 * hubAuth.handleUnauthorized() con il token usato. Le richieste che passano
 * un proprio header Authorization non vengono toccate.
 * Nessun timeout di default: la generazione AI può durare a lungo.
 */
export const http = axios.create({ baseURL: BASE })
hubAuth.installAxiosInterceptors(http)

/**
 * Client per gli endpoint pubblici (es. scambio del magic link): senza
 * interceptor, quindi mai con un Authorization di una sessione precedente.
 */
export const publicHttp = axios.create({ baseURL: BASE })

/**
 * Trasforma un errore axios con risposta HTTP in un Error con `message` leggibile
 * (message → error → "Errore N") e `status`, come si aspettano i chiamanti.
 * Gli errori senza risposta (rete assente, timeout) passano invariati.
 */
function toApiError(error) {
  if (!axios.isAxiosError(error) || !error.response) return error
  const { status, data } = error.response
  const err = new Error(data?.message ?? data?.error ?? `Errore ${status}`)
  err.status = status
  return err
}

/**
 * Esegue una richiesta autenticata e restituisce direttamente il body.
 * 204 (nessun contenuto) → null. Gli errori HTTP diventano Error con `status`.
 *
 * @param {import('axios').AxiosRequestConfig} config
 */
export async function apiRequest(config) {
  try {
    const res = await http.request(config)
    return res.status === 204 ? null : res.data
  } catch (error) {
    throw toApiError(error)
  }
}
