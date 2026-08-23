import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && window.location.pathname.startsWith('/app')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((erro) => {
      console.error('Falha ao registrar service worker:', erro)
    })
  })
}
