import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../navigation/Sidebar";
import BottomNav from "../navigation/BottomNav";
import RightPanel from "./RightPanel";
import VideoContainer from "../video/VideoContainer";

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

  return (
    <div className="flex h-screen h-[100dvh] text-white bg-[#0B0E14] relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 blur-2xl opacity-40"></div>

      <div className="flex w-full relative z-10 h-full">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        
        <div className="flex-1 overflow-y-auto w-full h-full relative scroll-smooth">
          <main className="h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </main>
          
          <VideoContainer />
        </div>
        
        {isRightPanelOpen && (
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