/**
 * Restituisce una stringa leggibile che descrive quanto tempo fa è avvenuto un evento.
 * @param {string|number|Date} date
 */
export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()

  if (diff < 60_000)        return 'adesso'
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)} min fa`
  if (diff < 86_400_000)    return `${Math.floor(diff / 3_600_000)} ore fa`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} giorni fa`

  return new Date(date).toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric' })
}
