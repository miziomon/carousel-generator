import { useState } from 'react'
import { postOtpRequest } from '../../lib/auth/api.js'
import { toast } from '../ui/Toast.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailStep({ auth }) {
  const [email, setEmail] = useState('')

  const isValid = EMAIL_RE.test(email.trim())

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || auth.isAuthLoading) return
    auth.setAuthLoading(true)
    try {
      await postOtpRequest(email.trim())
      auth.setPendingEmail(email.trim())
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      auth.setAuthLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth__form">
      <div className="auth__field">
        <label className="auth__label" htmlFor="auth-email">
          Il tuo indirizzo email
        </label>
        <input
          id="auth-email"
          className="auth__input"
          type="email"
          placeholder="nome@esempio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="email"
          disabled={auth.isAuthLoading}
        />
      </div>

      <button
        type="submit"
        className="auth__btn"
        disabled={!isValid || auth.isAuthLoading}
      >
        {auth.isAuthLoading ? 'Invio in corso…' : 'Invia codice'}
      </button>

      <p className="auth__hint">
        Riceverai un codice a 6 cifre via email. Nessuna password richiesta.
      </p>
    </form>
  )
}
