import { NavLink } from "react-router-dom";
import { Home, Video, Heart, MessageSquare, User, Bell } from "lucide-react";
import { useSocket } from "../../context/SocketContext";

const BottomNav = () => {
  const { counts } = useSocket();

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Video", path: "/video", icon: Video },
    { name: "Activity", path: "/notifications", icon: Bell, badge: counts.notifications },
    { name: "Messages", path: "/messages", icon: MessageSquare, badge: counts.messages },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <div 
      className={`
        bottom-nav md:hidden fixed bottom-0 left-0 w-full z-50 bg-[#0B0E14]/80 backdrop-blur-xl border-t border-white/5 pb-safe
        translate-y-0 opacity-100
      `}
    >
      <div className="flex items-center justify-around py-3 px-2 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/5 to-transparent pointer-events-none"></div>

        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all 
              ${isActive 
                ? "text-white" 
                : "text-gray-500 hover:text-gray-300"
              }
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-b-full shadow-[0_2px_10px_rgba(168,85,247,0.5)]"></div>
                )}

                <div className="relative">
                  <item.icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? "text-purple-400 scale-110" : "scale-100"}`} />
                  <span className={`absolute -top-2 -right-2 min-w-[16px] h-[16px] px-1 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-[#0B0E14] shadow-lg transition-all duration-300 ${
                    item.badge > 0 ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
                  }`}>
                    <span>{item.badge > 99 ? "99+" : item.badge}</span>
                  </span>
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