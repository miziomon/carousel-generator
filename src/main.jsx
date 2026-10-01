import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HubAuthProvider } from '@mavida/hub-auth/react'
import '@mavida/hub-auth/ui.css'
import './index.css'
import App from './App.jsx'
import { hubAuth } from './auth.js'
import { PwaUpdateNotice } from './components/update-toast/PwaUpdateNotice.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HubAuthProvider client={hubAuth}>
      <App />
      <PwaUpdateNotice />
    </HubAuthProvider>
  </StrictMode>
)
