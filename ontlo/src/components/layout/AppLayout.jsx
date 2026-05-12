import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "../navigation/BottomNav";
import Sidebar from "../navigation/Sidebar";
import VideoContainer from "../video/VideoContainer";
import RightPanel from "./RightPanel";

const AppLayout = ({ children }) => {
  const location = useLocation();
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  useEffect(() => {
    const pageTitles = {
      "/": "Home | Ontlo",
      "/video": "Video Chat | Ontlo",
      "/connections": "Connections | Ontlo",
      "/messages": "Messages | Ontlo",
      "/profile": "Profile | Ontlo",
      "/setup-profile": "Setup Profile | Ontlo",
      "/auth": "Welcome | Ontlo"
    };

    document.title = pageTitles[location.pathname] || "Ontlo";
  }, [location]);

  const isFullscreenPage = ['/video'].includes(location.pathname);

  return (
    <div className="flex h-screen h-[100dvh] text-white bg-[#0B0E14] relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 blur-2xl opacity-40"></div>

      <div className="flex w-full relative z-10 h-full">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        
        <div 
          id="main-scroll-container" 
          className={`flex-1 w-full h-full relative scroll-smooth ${
            ['/messages', '/video'].includes(location.pathname) ? 'overflow-hidden' : 'overflow-y-auto'
          } ${location.pathname === '/' ? 'scrollbar-hide md:scrollbar-default' : ''}`}
        >
          <main className={`min-h-full animate-in fade-in slide-in-from-bottom-2 duration-500 ${
            ['/messages', '/video'].includes(location.pathname) ? 'h-full' : 'pb-24 md:pb-0'
          }`}>
            {children}
          </main>
          
          <VideoContainer />
        </div>
        
        {isRightPanelOpen && !isFullscreenPage && location.pathname !== '/video' && (
          <div className="hidden xl:block animate-in slide-in-from-right duration-300">
            <RightPanel onClose={() => setIsRightPanelOpen(false)} />
          </div>
        )}
      </div>

      {/* Toggle button if closed */}
      {!isRightPanelOpen && (
        <button 
          onClick={() => setIsRightPanelOpen(true)}
          className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 w-8 h-20 bg-[#151923] border border-[#1e293b] border-r-0 rounded-l-2xl items-center justify-center text-gray-500 hover:text-white hover:bg-purple-600 transition-all z-[60] group shadow-2xl"
        >
          <div className="rotate-180 flex flex-col items-center gap-1">
             <div className="w-1 h-1 rounded-full bg-white/40 group-hover:bg-white"></div>
             <div className="w-1 h-1 rounded-full bg-white/40 group-hover:bg-white"></div>
             <div className="w-1 h-1 rounded-full bg-white/40 group-hover:bg-white"></div>
          </div>
        </button>
      )}

      <BottomNav />
    </div>
  );
};

export default AppLayout;