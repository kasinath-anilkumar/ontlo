import React, { useState } from 'react'
import { SiGoogleplay } from "react-icons/si";

const EmailWaitlist = () => {
  const [toastMessage, setToastMessage] = useState('')

  const handlePlayStoreClick = (e) => {
    e.preventDefault()
    setToastMessage('Ontlo for Android is currently in beta and will be available on the Google Play Store soon!')
    setTimeout(() => setToastMessage(''), 4000)
  }

  return (
    <div className="w-full relative">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 sm:gap-4 justify-center lg:justify-start mb-6 pt-2">
        {/* Web App CTA */}
        <a 
          href="https://app.ontlo.in" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center sm:justify-start gap-3 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-600 hover:from-pink-400 hover:via-fuchsia-400 hover:to-indigo-500 hover:shadow-[0_0_35px_rgba(236,72,153,0.35)] text-white font-medium py-3 px-6 rounded-xl transition-all duration-500 active:scale-95 cursor-pointer"
          >
          <svg className="w-5 h-5 text-white cursor-pointer" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <div className="text-left cursor-pointer">
            <div className="text-[9px] text-pink-100 font-extrabold uppercase tracking-widest leading-none cursor-pointer">Use in browser</div>
            <div className="text-sm font-semibold text-white mt-1 cursor-pointer">Launch Web App</div>
          </div>
        </a>

        {/* Play Store CTA */}
        <div className="relative group">
          {/* Badge */}
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-pink-500/20 border border-pink-500/30 text-pink-400 uppercase backdrop-blur-xl">
            Available Soon
          </span>
          <button 
            onClick={handlePlayStoreClick}
            className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-3 bg-white/[0.03] border border-white/10 hover:border-pink-500/30 hover:bg-white/[0.05] text-white font-medium py-3 px-6 rounded-xl transition-all duration-500 active:scale-95"
          >
            <SiGoogleplay className="w-5 h-5 text-gray-300 group-hover:text-pink-400 transition-colors duration-500" />
            <div className="text-left">
              <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest leading-none">Get it on</div>
              <div className="text-sm font-semibold text-white mt-1">Google Play</div>
            </div>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 bottom-[-45px] z-50 min-w-[280px] sm:min-w-[320px] bg-[#0b0e14]/90 border border-white/10 backdrop-blur-2xl px-4 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 transition-all duration-500 ${
          toastMessage ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-2 invisible'
        }`}
      >
        <span className="text-pink-500 text-sm leading-none">✦</span>
        <p className="text-gray-300 text-xs font-light">{toastMessage}</p>
      </div>

      {/* Trust Badge */}
      <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-gray-500 font-medium">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        Experience social discovery, reimagined.
      </div>
    </div>
  )
}

export default EmailWaitlist
