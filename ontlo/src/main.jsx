import { createRoot } from 'react-dom/client'
import '../src/styles/index.css'
import App from './App.jsx'

import { registerSW } from 'virtual:pwa-register'

// Auto update PWA
registerSW({
  immediate: true,
})

createRoot(document.getElementById('root')).render(
  <App />
)