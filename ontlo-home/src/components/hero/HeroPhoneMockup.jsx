import React from 'react'

const HeroPhoneMockup = () => {
  return (
    <div className="relative w-full max-w-[320px] aspect-[9/19] z-10 transform rotate-[-8deg] hover:rotate-[-5deg] transition-transform duration-700 mx-auto">
      {/* Background glowing gradients tightly coupled to phone */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-pink-600/30 to-purple-700/30 rounded-[3rem] blur-2xl -z-10"></div>
      
      {/* Phone Body with 3D edge effect */}
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-gray-700 via-gray-900 to-black p-[2px] shadow-2xl">
        {/* Screen */}
        <div className="relative w-full h-full rounded-[2.4rem] bg-[#07030D] overflow-hidden">
          
          {/* Top Notch/Bar */}
          <div className="px-5 pt-7 pb-4 flex justify-between items-center relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center">
                 <div className="w-2.5 h-2.5 bg-[#07030D] rounded-full"></div>
              </div>
              <span className="font-bold text-sm">ontlo</span>
            </div>
            <div className="flex gap-2">
               <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">+</div>
               <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px]">🔔</div>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="px-5 flex gap-5 text-xs font-semibold mb-6">
             <div className="flex flex-col gap-1">
                <span className="text-white">For you</span>
                <div className="w-full h-0.5 bg-pink-500 rounded-full"></div>
             </div>
             <span className="text-gray-500">Following</span>
             <span className="text-gray-500">Discover</span>
          </div>

          {/* Scrollable Content Area */}
          <div className="px-5 pb-20">
             {/* Post 1 */}
             <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5">
                       <img src="https://i.pravatar.cc/100?img=47" className="w-full h-full rounded-full border border-black object-cover" alt="Avatar"/>
                     </div>
                     <div>
                        <h4 className="text-[13px] font-bold text-gray-100">Ava Thompson</h4>
                        <p className="text-[10px] text-gray-500">@avathompson · 2h</p>
                     </div>
                   </div>
                   <div className="text-gray-500">•••</div>
                </div>
                <p className="text-[12px] text-gray-300 mb-3 leading-relaxed">
                  Sunsets hit different when you're with the right people. 🌅 Grateful for moments like these.
                </p>
                <div className="w-full h-40 rounded-xl overflow-hidden mb-3">
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 via-red-500 to-purple-600"></div>
                </div>
                <div className="flex items-center gap-5 text-gray-400 text-[11px] font-semibold">
                   <span className="flex items-center gap-1.5 text-pink-500">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                     254
                   </span>
                   <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                     32
                   </span>
                   <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                     17
                   </span>
                   <span className="ml-auto hover:text-white transition-colors cursor-pointer">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                   </span>
                </div>
             </div>

             {/* Post 2 */}
             <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-3">
                     <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5">
                       <img src="https://i.pravatar.cc/100?img=11" className="w-full h-full rounded-full border border-black object-cover" alt="Avatar"/>
                     </div>
                     <div>
                        <h4 className="text-[13px] font-bold text-gray-100">Noah Carter</h4>
                        <p className="text-[10px] text-gray-500">@noahcarter · 4h</p>
                     </div>
                   </div>
                   <div className="text-gray-500">•••</div>
                </div>
                <p className="text-[12px] text-gray-300 mb-3 leading-relaxed">
                  Just found a new coffee spot that feels like home. ☕✨
                </p>
             </div>
          </div>

          {/* Bottom Nav */}
          <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-t border-gray-900 pb-8">
             <div className="text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
             </div>
             <div className="text-gray-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(219,39,119,0.5)] transform -translate-y-2">
                +
             </div>
             <div className="text-gray-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
             </div>
             <div className="text-gray-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroPhoneMockup
