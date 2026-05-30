import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Privacy from './components/sections/privacySections'
import Terms from './components/sections/termsSections'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen overflow-x-hidden bg-[#04010D] text-white font-sans selection:bg-pink-500/30 selection:text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<Home />} />
          <Route path="/features" element={<Home />} />
          <Route path="/safety" element={<Home />} />
          <Route path="/contact" element={<Home />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
