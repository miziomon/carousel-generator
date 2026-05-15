export const CAROUSEL_LIMIT_FREE = 10

/**
 * Deriva il tier dall'oggetto user e dal flag isLoggedIn.
 * @returns {'anonymous'|'free'|'pro'|'admin'}
 */
export function getTier(user, isLoggedIn) {
  if (!isLoggedIn || !user) return 'anonymous'
  if (user.role === 'admin') return 'admin'
  if (user.plan === 'basic') return 'free'
  return 'pro'
}

/**
 * Restituisce il numero massimo di caroselli salvabili per il tier.
 */
export function getMaxCarousels(tier) {
  if (tier === 'free') return CAROUSEL_LIMIT_FREE
  return Infinity
}

/**
 * Verifica se l'utente può salvare un nuovo carosello.
 * @param {string} tier
 * @param {number|null} count - numero attuale di caroselli salvati (null = non ancora caricato)
 */
export function canSaveCarousel(tier, count) {
  if (tier === 'anonymous') return false
  if (tier === 'free' && count !== null && count >= CAROUSEL_LIMIT_FREE) return false
  return true
}
