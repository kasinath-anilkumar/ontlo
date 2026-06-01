import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Instagram, Menu, X } from 'lucide-react'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => setIsMenuOpen(false)

  const handleNavClick = (e, path) => {
    e.preventDefault()
    const targetId = path.substring(1)

    if (window.location.pathname !== '/') {
      window.location.href = `/${path}`
      return
    }

    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    } else if (targetId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    window.history.pushState(null, '', `/${path}`)
    closeMenu()
  }

  const navLinks = [
    { name: 'Home', path: '#home' },
    { name: 'About', path: '#about' },
    { name: 'Features', path: '#features' },
    { name: 'Safety', path: '#safety' },
    // { name: 'Contact', path: '#contact' },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 px-4 md:px-8 pt-2">
        <div className="sm:px-0 md:px-10  mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_0_40px_rgba(168,85,247,0.08)]">

            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

            <div className="relative flex items-center justify-between px-6 py-1">

              {/* Logo */}
              <Link
                to="/"
                onClick={closeMenu}
                className="flex items-center gap-3 group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500 blur-xl opacity-60 group-hover:opacity-100 transition duration-500" />
                </div>

                <img src="/ontlo_logo.webp" className='w-16' alt="logo" />
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-10">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={`/${link.path}`}
                    onClick={(e) => handleNavClick(e, link.path)}
                    className="relative text-sm text-gray-300 hover:text-white transition duration-300 group"
                  >
                    {link.name}

                    {/* Underline */}
                    <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 group-hover:w-full" />
                  </a>
                ))}
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-4">

                {/* Socials & CTA */}
                <div className="hidden md:flex items-center gap-4">
                  <a
                    href="https://www.instagram.com/ontlo.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all duration-300"
                  >
                    <Instagram size={18} />
                  </a>

                  <a
                    href="https://x.com/ontloapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all duration-300"
                  >
                    <span className="text-sm font-bold">𝕏</span>
                  </a>

                  <a
                    href="https://app.ontlo.in"
                    target="_blank"
                    className="ml-2 px-6 py-2.5 rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl text-white text-sm font-medium transition-all duration-500 hover:border-pink-500/40 hover:shadow-[0_0_40px_rgba(236,72,153,0.25)]"
                  >
                    <span className="bg-gradient-to-r from-white via-white to-pink-200 bg-clip-text text-transparent">
                      Get Ontlo
                    </span>
                  </a>
                </div>

                {/* Mobile Button */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden relative z-50 w-11 h-11 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl flex items-center justify-center text-white"
                >
                  <div className="transition-all duration-300">
                    {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${isMenuOpen
          ? 'opacity-100 visible'
          : 'opacity-0 invisible'
          }`}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-[#04010D]/95 backdrop-blur-3xl" />

        {/* Glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/20 blur-[140px]" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center gap-10">

          {navLinks.map((link, index) => (
            <a
              key={link.name}
              href={`/${link.path}`}
              onClick={(e) => handleNavClick(e, link.path)}
              className="text-3xl font-semibold text-white hover:text-pink-400 transition-all duration-300 hover:scale-110"
              style={{
                transitionDelay: `${index * 60}ms`,
              }}
            >
              {link.name}
            </a>
          ))}

          {/* Mobile CTA */}
          <a
            href="https://app.ontlo.in"
            target="_blank"
            className="px-8 py-3 text-sm font-semibold rounded-full border border-white/10 bg-white/5 hover:border-pink-500/30 hover:bg-gradient-to-r hover:from-pink-500/15 hover:to-purple-600/15 text-white transition-all duration-500 shadow-[0_0_30px_rgba(236,72,153,0.1)] active:scale-95"
          >
            Get Ontlo
          </a>

          {/* Socials */}
          <div className="flex items-center gap-5 mt-2">
            <a
              href="https://www.instagram.com/ontlo.in"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-gray-300 hover:text-white hover:bg-purple-500/10 transition-all"
            >
              <Instagram size={24} />
            </a>

            <a
              href="https://x.com/ontloapp"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-gray-300 hover:text-white hover:bg-purple-500/10 transition-all"
            >
              <span className="text-xl font-bold">𝕏</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export default Navbar