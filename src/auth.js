/**
 * Client di autenticazione OTP condiviso (libreria @mavida/hub-auth).
 *
 * Sostituisce l'implementazione locale (hooks/useAuth.js + lib/auth/{api,
 * storage}.js): il flusso email → OTP → sessione, la persistenza, la
 * guardia sul 401 e la validazione al boot (GET /me) sono ora nella
 * libreria, condivisa con gli altri progetti hub.
 *
 * Il magic link (lib/auth/agentSession.js, /access-links/exchange) resta un
 * meccanismo a parte per ottenere il session_token, ma una volta ottenuto
 * viene adottato con hubAuth.adoptSession() (v1.1.0): da quel momento è
 * gestito esattamente come una sessione OTP (persistenza, 401, refresh).
 *
 * `legacyKeys` recupera la sessione salvata dalla vecchia implementazione
 * (chiave 'carosello:user_session', v1.31.0 e precedenti) così la
 * migrazione non slogga chi era già autenticato — incluse le sessioni
 * agent-link, il cui `sessionToken` la vecchia versione salvava ma non
 * usava mai come Bearer (vedi CHANGELOG: era il bug di sicurezza che
 * teneva viva l'app col solo VITE_API_AUTH_TOKEN statico).
 */

import { createHubAuth } from '@mavida/hub-auth'

export const hubAuth = createHubAuth({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  storageKey: 'carosello:hub_session',
  legacyKeys: ['carosello:user_session'],
  // Chiave del tool nel catalogo di hub (generations_tools): il login e lo
  // scambio SSO verificano che l'utente abbia il tool abilitato (admin esenti).
  tool: 'carousel-generator',
  // SSO tra le app (hub-auth 1.2.0): il login fatto su un'altra app apre anche
  // questa senza OTP, e logout() esce da tutte. Richiede che baseUrl punti
  // all'host canonico di hub (https://hub.mavida.com/api/v1/) e che questa
  // origine sia in SSO_ALLOWED_ORIGINS sul server; altrimenti il login ripiega
  // da solo sul flusso senza cookie.
  sso: true,
})
