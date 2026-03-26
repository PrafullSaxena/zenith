import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Debug: verify preload exposed all API namespaces
if (window.api) {
  console.log('[renderer] window.api namespaces:', Object.keys(window.api).join(', '))
} else {
  console.error('[renderer] window.api is UNDEFINED — preload did not load')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
