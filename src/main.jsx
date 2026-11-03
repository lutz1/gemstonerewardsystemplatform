import '@fortawesome/fontawesome-free/css/all.min.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import {
    listenForForegroundPushNotifications,
    preparePushServiceWorker,
} from './utils/pushNotifications.js'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
    preparePushServiceWorker().catch((error) => {
      console.warn('Firebase messaging service worker registration failed:', error)
    })
    listenForForegroundPushNotifications().catch((error) => {
      console.warn('Firebase foreground push listener failed:', error)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
