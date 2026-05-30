import React from 'react'

const FloatingCards = () => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      
      {/* Top Right Card */}
      <div className="absolute top-10 -right-16 md:-right-24 lg:-right-32 w-48 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-4 transform rotate-12 shadow-2xl">
         <div className="mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
         </div>
         <h4 className="text-sm font-bold text-white mb-1">Your Feed</h4>
         <p className="text-[10px] text-gray-400">Curated for you, not the algorithm.</p>
      </div>

      {/* Middle Left Card */}
      <div className="absolute top-1/2 -left-16 md:-left-24 lg:-left-32 -translate-y-1/2 w-40 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-4 transform -rotate-6 shadow-2xl">
         <div className="mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
         </div>
         <h4 className="text-sm font-bold text-white mb-1">Total Privacy</h4>
         <p className="text-[10px] text-gray-400">Your data stays yours.</p>
      </div>

      {/* Bottom Right Card */}
      <div className="absolute bottom-10 -right-12 md:-right-20 lg:-right-28 w-44 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-4 transform rotate-[-8deg] shadow-2xl">
         <div className="mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
         </div>
         <h4 className="text-sm font-bold text-white mb-1">Real People</h4>
         <p className="text-[10px] text-gray-400">Connect with what matters.</p>
      </div>

      {/* Small floating hearts */}
      <div className="absolute top-0 left-0 w-10 h-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center transform -rotate-12">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#a855f7" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </div>

      <div className="absolute bottom-20 left-10 w-12 h-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center transform rotate-12">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#6366f1" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </div>

    </div>
  )
}

export default FloatingCards
