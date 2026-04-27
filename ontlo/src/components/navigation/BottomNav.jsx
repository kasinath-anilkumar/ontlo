import { NavLink } from "react-router-dom";
import { Home, Video, Heart, MessageSquare, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import API_URL from "../../utils/api";

const BottomNav = () => {
  const { socket } = useSocket();
  const [counts, setCounts] = useState({ messages: 0, connections: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/notifications/counts`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) setCounts(data);
      } catch (err) {
        console.error("Failed to fetch notification counts", err);
      }
    };

    fetchCounts();

    // Re-fetch on socket events
    if (socket) {
      socket.on("connect", fetchCounts);
      socket.on("notification-update", fetchCounts);
    }

    // Refresh when user comes back to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCounts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(fetchCounts, 15000); // Check every 15s fallback
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (socket) {
        socket.off("connect", fetchCounts);
        socket.off("notification-update", fetchCounts);
      }
    };
  }, [socket]);

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Video", path: "/video", icon: Video },
    { name: "Connections", path: "/connections", icon: Heart, badge: counts.connections },
    { name: "Messages", path: "/messages", icon: MessageSquare, badge: counts.messages },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <div className="bottom-nav md:hidden fixed bottom-0 left-0 w-full z-50 bg-[#0B0E14]/80 backdrop-blur-lg border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around py-3 px-2 relative">
        {/* Animated background indicator matching theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent pointer-events-none"></div>

        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all duration-300
              ${isActive 
                ? "text-white" 
                : "text-gray-500 hover:text-gray-300"
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active Indicator Glow */}
                {isActive && (
                  <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-full shadow-[0_2px_10px_rgba(168,85,247,0.5)]"></div>
                )}

                <div className="relative">
                  <item.icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? "text-purple-400 scale-110" : "scale-100"}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] px-1 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-[#0B0E14] shadow-lg">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] mt-1 font-black uppercase tracking-widest transition-all duration-300 ${isActive ? "opacity-100 translate-y-0" : "opacity-40"}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;