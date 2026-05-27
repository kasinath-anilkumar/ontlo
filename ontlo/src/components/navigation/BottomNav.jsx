import { NavLink } from "react-router-dom";
import {
  Home,
  Radio,
  MessageSquare,
  User,
  Search,
} from "lucide-react";

import { useSocket } from "../../context/SocketContext";

const BottomNav = () => {
  const { counts } = useSocket();

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Connect", path: "/video", icon: Radio },
    { name: "Search", path: "/search", icon: Search },
    {
      name: "Messages",
      path: "/messages",
      icon: MessageSquare,
      badge: counts.messages,
    },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <div
      className="
        bottom-nav md:hidden fixed bottom-0 left-0 w-full z-50
        bg-[#0B0E14]/80 backdrop-blur-xl border-t border-white/5 pb-safe
        translate-y-0 opacity-100
      "
    >
      <div className="flex items-center justify-between py-4 px-1 relative w-full ">
        
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#c026ff]/5 to-transparent pointer-events-none"></div>

        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center
              py-1 px-1 flex-1 min-w-0 transition-all duration-300
              ${
                isActive
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300"
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* SVG Gradient */}
                <svg width="0" height="0">
                  <defs>
                    <linearGradient
                      id={`ontloGradient-${item.name}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#ff255f" />
                      <stop offset="35%" stopColor="#ff2f92" />
                      <stop offset="70%" stopColor="#c026ff" />
                      <stop offset="100%" stopColor="#5b2dff" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-gradient-to-r from-[#ff255f] via-[#ff2f92] via-[#c026ff] to-[#5b2dff] shadow-[0_2px_12px_rgba(192,38,255,0.45)]"></div>
                )}

                {/* Icon */}
                <div className="relative">
                  <item.icon
                    className={`w-6 h-6 transition-all duration-300 ${
                      isActive
                        ? "scale-110 drop-shadow-[0_0_10px_rgba(192,38,255,0.45)]"
                        : "scale-100 text-gray-500"
                    }`}
                    style={
                      isActive
                        ? {
                            stroke: `url(#ontloGradient-${item.name})`,
                          }
                        : {}
                    }
                  />

                  {/* Badge */}
                  <span
                    className={`absolute -top-2 -right-2 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-[#0B0E14] bg-gradient-to-r from-[#ff255f] via-[#ff2f92] via-[#c026ff] to-[#5b2dff] shadow-[0_0_12px_rgba(192,38,255,0.45)] transition-all duration-300 ${
                      item.badge > 0
                        ? "scale-100 opacity-100"
                        : "scale-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <span>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  </span>
                </div>

                {/* Label */}
                <span
                  className={`text-[8px] sm:text-[9px] mt-1 font-black uppercase tracking-wider text-center truncate w-full transition-all duration-300 ${
                    isActive
                      ? "opacity-100 text-fuchsia-300"
                      : "opacity-40"
                  }`}
                >
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