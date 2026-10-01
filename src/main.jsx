import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider } from './components/auth/AuthContext'
import './styles.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
