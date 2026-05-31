import React from 'react'
import EmailWaitlist from './EmailWaitlist'

const HeroContent = () => {
  return (
    <div className="max-w-xl px-4 z-10 w-full mx-auto lg:mx-0 text-center lg:text-left pt-10 lg:pt-0">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold tracking-widest text-gray-300 mb-6 lg:mb-4 uppercase shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-sm mx-auto lg:mx-0">
        <span className="text-pink-500 text-base leading-none">✦</span> Connect More Less Noise
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.15] mb-4 lg:mb-6 tracking-tight">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
          Social Media,
        </span><br />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
          Rebuilt From
        </span><br />
        <span className="text-white">the Ground Up.</span>
      </h1>

      <p className="text-gray-400 text-base md:text-lg mb-4 lg:mb-6 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed">
        The internet became obsessed with being noticed. Ontlo is built around being remembered.
      </p>

      <div className="flex justify-between items-center w-full gap-2 lg:gap-8 mb-2 lg:mb-6 max-w-sm lg:max-w-none mx-auto lg:mx-0">
        {/* <div className="flex flex-col items-center gap-2 text-center flex-1">
          <div className="text-gray-400">
            <svg
              className="w-5 h-5 lg:w-6 lg:h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-xs text-gray-300 font-medium">
            Privacy First
          </span>
        </div> */}

        <div className="w-[1px] h-8 bg-gray-800 opacity-50"></div>

        <div className="flex flex-col items-center gap-2 text-center flex-1">
          <div className="text-gray-400">
            <svg
              className="w-5 h-5 lg:w-6 lg:h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="purple"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-xs text-gray-300 font-medium">
            Real Connections
          </span>
        </div>

        <div className="w-[1px] h-8 bg-gray-800 opacity-50"></div>

        <div className="flex flex-col items-center gap-2 text-center flex-1">
          <div className="text-gray-400">
            <svg
              className="w-5 h-5 lg:w-6 lg:h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="green"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-xs text-gray-300 font-medium">
            Safe Community
          </span>
        </div>

        <div className="w-[1px] h-8 bg-gray-800 opacity-50"></div>

        <div className="flex flex-col items-center gap-2 text-center flex-1">
          <div className="text-gray-400">
            <svg
              className="w-5 h-5 lg:w-6 lg:h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="yellow"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-xs text-gray-300 font-medium">
            Authentic Social
          </span>
        </div>
      </div>

      <EmailWaitlist />

      {/* Join Community hidden on mobile since it's not in the new reference */}
      <div className="mt-2 lg:mt-6 hidden lg:flex flex-col items-center lg:items-start">
  <h4 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">
    Be Part of Ontlo
  </h4>

  <div className="flex items-center gap-4">
    {/* X / Twitter */}
    <a
      href="https://x.com/ontlo"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Follow Ontlo on X"
      className="w-10 cursor-pointer h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>

    {/* Discord */}
    {/* <a
      href="https://discord.gg/your-invite"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join Ontlo on Discord"
      className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 127.14 96.36"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.68,2a67.55,67.55,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.1M42.68,68.74c-5.36,0-9.76-4.9-9.76-10.9S37.21,47,42.68,47s9.85,4.9,9.76,10.9-4.32,10.84-9.76,10.84m41.71,0c-5.36,0-9.76-4.9-9.76-10.9S78.93,47,84.39,47s9.85,4.9,9.76,10.9-4.33,10.84-9.76,10.84" />
      </svg>
    </a> */}

    {/* Instagram */}
    <a
      href="https://instagram.com/ontlo"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Follow Ontlo on Instagram"
      className="w-10 h-10 cursor-pointer rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    </a>
  </div>
</div>
    </div>
  )
}

export default HeroContent
