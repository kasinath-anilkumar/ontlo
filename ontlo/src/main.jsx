import { createRoot } from 'react-dom/client'
import '../src/styles/index.css'
import App from './App.jsx'

// Register Service Worker for PWA (Production Only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js')
      .then(reg => console.log('SW Registered!', reg))
      .catch(err => console.log('SW Register Error:', err));
  });
}

createRoot(document.getElementById('root')).render(
  <App />
)
