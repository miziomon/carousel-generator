import './auth.css'
import { EmailStep } from './EmailStep.jsx'
import { OtpStep } from './OtpStep.jsx'
import pkg from '../../../package.json'

export function LoginScreen({ auth }) {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__logo">Carousel Generator</span>
          <span className="auth__version">v{pkg.version}</span>
          <span className="auth__tagline">Accedi per creare e modificare caroselli</span>
        </div>

        {auth.authStep === 'email' ? (
          <EmailStep auth={auth} />
        ) : (
          <OtpStep auth={auth} />
        )}
      </div>
    </div>
  )
}
