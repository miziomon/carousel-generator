import { hubAuth } from '../../auth.js'

export function getAiConfig() {
  const base = import.meta.env.VITE_API_BASE_URL
  return {
    url: base ? base.replace(/\/?$/, '/') + 'chat/completions' : null,
    token: hubAuth.getToken(),
  }
}

export function isAiConfigured() {
  const { url, token } = getAiConfig()
  return Boolean(url && token)
}
