import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/clerk-react'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const root = ReactDOM.createRoot(document.getElementById('root'))

if (CLERK_KEY) {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_KEY} appearance={{
        variables: { colorPrimary: '#2dd4bf', colorBackground: '#111', colorText: '#f0f0f0', colorInputBackground: '#0a0a0a', colorInputText: '#f0f0f0' },
        elements: { card: { backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }, formButtonPrimary: { background: 'linear-gradient(135deg,#2dd4bf,#14b8a6)', color: '#000', fontWeight: 700, borderRadius: '12px' }, footerActionLink: { color: '#2dd4bf' }, headerTitle: { color: '#f0f0f0' }, headerSubtitle: { color: '#a3a3a3' }, socialButtonsBlockButton: { border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', backgroundColor: '#0a0a0a', color: '#f0f0f0' }, formFieldInput: { backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#f0f0f0' }, formFieldLabel: { color: '#a3a3a3' }, dividerLine: { borderColor: 'rgba(255,255,255,0.06)' }, dividerText: { color: '#525252' } }
      }}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
