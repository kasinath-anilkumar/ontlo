import { NavLink, useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { useEffect, useState } from "react";
import API_URL, { apiFetch } from "../../utils/api";
import logo from "../../assets/ontlo_Logo.png";
import { 
  Home, 
  Video, 
  Heart, 
  MessageSquare, 
  Users, 
  Star, 
  User,
  ChevronRight,
  Bell
} from "lucide-react";

const Sidebar = () => {
  const { user, socket } = useSocket();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ connections: 0, messages: 0, likes: 0, notifications: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await apiFetch(`${API_URL}/api/notifications/counts`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };
    
    if (user) fetchStats();

    if (socket) {
      socket.on("notification-update", fetchStats);
      socket.on("chat-message", fetchStats);
    }

    return () => {
      if (socket) {
        socket.off("notification-update", fetchStats);
        socket.off("chat-message", fetchStats);
      }
    };
  }, [user, socket]);

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Video Chat", path: "/video", icon: Video },
    { name: "Notifications", path: "/notifications", icon: Bell, badge: stats.notifications },
    { name: "Connections", path: "/connections", icon: Heart, badge: stats.connections },
    { name: "Messages", path: "/messages", icon: MessageSquare, badge: stats.messages },
    { name: "Who Liked You", path: "/who-liked-you", icon: Users, badge: stats.likes },
    { name: "Favorites", path: "/favorites", icon: Star },
    { name: "Profile & Settings", path: "/profile", icon: User },
  ];

  return (
    <div className="w-64 bg-[#0B0E14]/80 backdrop-blur-lg border-r border-white/5 p-6 flex flex-col h-screen overflow-y-auto relative z-40">
      
      {/* Sidebar background glow */}
      <div className="absolute top-0 left-0 w-full h-40 bg-purple-600/15 blur-[80px] pointer-events-none"></div>

      {/* Logo */}
      <div className="flex items-center gap-3 px-2 pb-8 cursor-pointer group" onClick={() => navigate("/")}>
        <img className="w-20" src={logo} alt="Logo" />
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center justify-between px-4 py-3.5 rounded-[18px] transition-all duration-300 relative overflow-hidden group
              ${isActive 
                ? "bg-white/5 text-white border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.2)]" 
                : "text-gray-500 hover:text-white hover:bg-white/[0.03]"
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active Glow matching theme */}
                {isActive && (
                   <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-500/10 opacity-100"></div>
                )}
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`transition-all duration-300 ${isActive ? 'text-purple-400 scale-110' : 'group-hover:scale-110'}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`font-black text-[10px] uppercase tracking-[0.2em] transition-all ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                    {item.name}
                  </span>
                </div>

                <span className={`relative z-10 text-[9px] min-w-[18px] h-[18px] flex items-center justify-center font-black px-1 rounded-full transition-all duration-300 ${
                  item.badge > 0 ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
                } ${isActive ? 'bg-white text-purple-600 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'}`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
                
                {/* Left active border indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full shadow-[2px_0_10px_rgba(168,85,247,0.5)]"></div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div 
        onClick={() => navigate("/profile")}
        className="mt-4 p-3 rounded-[24px] bg-white/[0.03] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-all group backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {user?.profilePic ? (
              <img src={user.profilePic} alt={user?.username} className="w-10 h-10 rounded-full object-cover border-2 border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#151923] border-2 border-white/10 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0B0E14] shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
          </div>
          <div>
            <p className="text-sm font-black text-white truncate w-24 tracking-tight">{user?.fullName?.split(' ')[0] || user?.username}</p>
            <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">My Profile</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
      </div>
    </div>
  );
};

export default Sidebar;