const BASE = import.meta.env.VITE_API_BASE_URL

if (!BASE) {
  console.warn('[auth] VITE_API_BASE_URL non definita — le chiamate auth falliranno.')
}

async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, options)
  if (!res.ok) {
    let message
    try {
      const body = await res.json()
      message = body?.message || body?.error || `Errore ${res.status}`
    } catch {
      message = `Errore ${res.status}`
    }
    throw new Error(message)
  }
  return res.json()
}

export async function postOtpRequest(email) {
  return apiFetch('otp-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function postOtpVerify(email, otp_code) {
  return apiFetch('otp-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp_code }),
  })
}

export async function getProfile(userId) {
  const token = import.meta.env.VITE_API_AUTH_TOKEN
  return apiFetch(`profile/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
