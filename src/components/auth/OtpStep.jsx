import { useRef, useState, useEffect } from 'react'
import { postOtpVerify, postOtpRequest, getProfile } from '../../lib/auth/api.js'
import { toast } from '../ui/Toast.jsx'

const DIGITS = 6

export function OtpStep({ auth }) {
  const [digits, setDigits] = useState(Array(DIGITS).fill(''))
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  function focusAt(index) {
    inputRefs.current[Math.max(0, Math.min(DIGITS - 1, index))]?.focus()
  }

  async function submitCode(code) {
    if (auth.isAuthLoading) return
    auth.setAuthLoading(true)
    try {
      const data = await postOtpVerify(auth.pendingEmail, code)
      const user = { email: data.email, userId: data.user_id, role: null, plan: null }
      auth.loginSuccess(user)
      // Profile in background — non bloccante
      getProfile(data.user_id)
        .then((profile) => auth.setUserRole(profile.role, profile.plan))
        .catch(() => {})
    } catch (err) {
      toast(err.message, 'error')
      setDigits(Array(DIGITS).fill(''))
      setTimeout(() => focusAt(0), 50)
    } finally {
      auth.setAuthLoading(false)
    }
  }

  function handleChange(index, value) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, i) => (i === index ? char : d))
    setDigits(next)
    if (char) {
      if (index < DIGITS - 1) {
        focusAt(index + 1)
      }
      if (next.every(Boolean)) {
        submitCode(next.join(''))
      }
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusAt(index - 1)
    }
    if (e.key === 'Enter') {
      const code = digits.join('')
      if (code.length === DIGITS) submitCode(code)
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS)
    if (!pasted.length) return
    const next = Array(DIGITS).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    focusAt(Math.min(pasted.length, DIGITS - 1))
    if (pasted.length === DIGITS) submitCode(pasted)
  }

  async function handleResend() {
    try {
      await postOtpRequest(auth.pendingEmail)
      toast('Codice reinviato', 'success')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="auth__otp">
      <div className="auth__field">
        <label className="auth__label">Codice di verifica</label>
        <div className="auth__otp-row">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              className="auth__otp-digit"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={auth.isAuthLoading}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="auth__btn"
        disabled={digits.join('').length < DIGITS || auth.isAuthLoading}
      >
        {auth.isAuthLoading ? 'Verifica in corso…' : 'Verifica codice'}
      </button>

      <p className="auth__hint">
        Codice inviato a <strong>{auth.pendingEmail}</strong>
      </p>

      <div className="auth__links">
        <button type="button" className="auth__link" onClick={auth.resetToEmailStep}>
          Cambia email
        </button>
        <button type="button" className="auth__link" onClick={handleResend}>
          Reinvia codice
        </button>
      </div>
    </div>
  )
}
