import { getDynamicGreeting } from "../utils/greeting";
import { Search, Bell, Users, Globe, Video, Heart, MessageSquare, ChevronRight, User, Star } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import API_URL from "../utils/api";
import banner1 from "../assets/banner1.png";
import banner2 from "../assets/banner2.png";

const Home = () => {
  const navigate = useNavigate();
  const { socket, user } = useSocket();
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(true);

  useEffect(() => {
    if (!socket) return;
    socket.on("online-count", ({ count }) => setOnlineCount(count));
    return () => socket.off("online-count");
  }, [socket]);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      setLoadingOnline(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/users/online`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) setOnlineUsers(data);
      } catch (err) {
        console.error("Failed to fetch online users", err);
      } finally {
        setLoadingOnline(false);
      }
    };
    fetchOnlineUsers();
  }, [onlineCount]);

  return (
    <div className="flex flex-col h-full space-y-6 sm:space-y-8 pt-8 sm:pt-10 pb-32 sm:pb-16 px-4 sm:px-8 lg:px-12 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-pink-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Top Bar */}
      <header className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 relative z-10 px-1">
        <div className="relative flex-1 md:flex-none md:w-64 hidden xs:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-[#151923] border border-[#1e293b] text-white text-sm rounded-xl pl-10 pr-4 py-2 sm:py-2.5 focus:outline-none focus:border-purple-500/50 transition-all shadow-lg"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <div className="bg-[#151923]/60 backdrop-blur-md border border-[#1e293b] rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 flex-shrink-0 shadow-lg shadow-green-500/5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[10px] sm:text-sm font-medium text-gray-300">
              {onlineCount.toLocaleString()} <span className="hidden xxs:inline">Online</span>
            </span>
          </div>
          <button onClick={() => navigate("/messages")} className="w-8 h-8 sm:w-10 sm:h-10 bg-[#151923] border border-[#1e293b] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/50 transition-all shadow-lg">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button onClick={() => navigate("/profile")} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-purple-500/20 overflow-hidden transition-all hover:scale-110 hover:border-purple-500 shadow-lg bg-[#151923] flex items-center justify-center">
            {user?.profilePic ? (
              <img src={user.profilePic} alt={user?.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">{getDynamicGreeting()}, {user?.fullName?.split(' ')[0] || user?.username} 👋</h1>
          <p className="text-sm sm:text-base text-gray-400">Ready to meet someone new?</p>
        </div>
        <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0B0F1F] via-[#0E1330] to-[#140F2E] p-6 md:p-10 transition-all duration-500 min-h-[380px]">
          
          {/* Glow background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.25),transparent_40%)] pointer-events-none" />

          <div className="relative grid md:grid-cols-2 gap-8 items-center z-20">

            {/* LEFT CONTENT */}
            <div className="space-y-6">
              {/* Online badge */}
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-white/10 shadow-xl">
                <Globe className="w-4 h-4 text-purple-400" />
                <div className="flex -space-x-2">
                  {onlineUsers.length > 0 ? (
                    onlineUsers.slice(0, 3).map((u) => (
                      u.profilePic ? (
                        <img key={u._id} src={u.profilePic} className="w-7 h-7 rounded-full border border-black object-cover" />
                      ) : (
                        <div key={u._id} className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center border border-black">
                          <User className="w-3.5 h-3.5 text-white" />
                        </div>
                      )
                    ))
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full bg-purple-600 border border-black"></div>
                      <div className="w-7 h-7 rounded-full bg-pink-600 border border-black"></div>
                    </>
                  )}
                </div>
                <span className="text-xs text-white/80">
                  <span className="font-semibold text-white">{onlineCount.toLocaleString()}</span> people are online now
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                Start a{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  Video Chat
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-white/70 max-w-sm text-base font-medium">
                Jump into a conversation and see where it leads.
              </p>

              {/* CTA */}
              <button 
                onClick={() => navigate("/video")}
                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:scale-105 transition active:scale-95 shadow-purple-500/20"
              >
                <Video size={20} className="fill-current" />
                <span className="text-base">Start Video Chat</span>
              </button>

              {/* Bottom note */}
              <div className="pt-2">
                <p className="text-[10px] sm:text-xs text-white/50 flex items-center gap-2 font-medium">
                  ⚡ Instant match • No waiting • Real people
                </p>
              </div>
            </div>

            {/* RIGHT VISUAL */}
            <div className="relative flex justify-center items-center hidden md:flex h-full py-6">
              
              {/* Girl Card */}
              <div className="relative z-10 rotate-[-6deg] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl transition-transform hover:rotate-0 duration-500">
                <img
                  src={banner1}
                  className="w-48 lg:w-56 h-[280px] lg:h-[320px] object-cover rounded-xl"
                  alt="Live 1"
                />
                {/* Live badge */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-2 border border-white/10">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
                  Live
                </div>
              </div>

              {/* Boy Card */}
              <div className="absolute right-0 translate-x-8 rotate-[8deg] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl transition-transform hover:rotate-0 duration-500">
                <img
                  src={banner2}
                  className="w-48 lg:w-56 h-[280px] lg:h-[320px] object-cover rounded-xl"
                  alt="Live 2"
                />
                {/* Live badge */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-2 border border-white/10">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
                  Live
                </div>
              </div>

              {/* Floating buttons */}
              <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 flex gap-3 z-30">
                <div className="w-11 h-11 flex items-center justify-center rounded-full bg-pink-500 shadow-xl border-[3px] border-[#0E1330] hover:scale-110 transition cursor-pointer">
                  <Heart size={18} className="text-white fill-current" />
                </div>

                <div className="w-11 h-11 flex items-center justify-center rounded-full bg-purple-500 shadow-xl border-[3px] border-[#0E1330] hover:scale-110 transition cursor-pointer">
                  <Video size={18} className="text-white fill-current" />
                </div>
              </div>

              {/* Glow rings */}
              <div className="absolute w-[280px] h-[280px] rounded-full border border-purple-500/10 animate-pulse pointer-events-none" />
              <div className="absolute w-[380px] h-[380px] rounded-full border border-pink-500/5 pointer-events-none" />
            </div>

          </div>
        </div>
      </div>

      {/* Active Now */}
      {onlineUsers.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <div className="flex justify-between items-center mb-4 sm:mb-6 px-1">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Active Now</h3>
            <button onClick={() => alert("All active users are listed here. Swipe to see more!")} className="text-xs font-bold text-purple-400 hover:text-purple-300 transition">View all</button>
          </div>
          
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
            {loadingOnline ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3 flex-shrink-0">
                  <Skeleton circle={true} className="w-14 h-14 sm:w-16 sm:h-16" />
                  <Skeleton className="w-12 h-2 rounded-full" />
                </div>
              ))
            ) : onlineUsers.map((u) => (
              <div key={u._id} className="flex flex-col items-center gap-3 flex-shrink-0 cursor-pointer group snap-center">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 bg-gradient-to-b from-purple-500 to-transparent group-hover:from-purple-400 transition-all shadow-lg group-hover:shadow-purple-500/20">
                    {u.profilePic ? (
                      <img src={u.profilePic} loading="lazy" className="w-full h-full rounded-full border-2 border-[#0B0E14] object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full border-2 border-[#0B0E14] bg-[#151923] flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-[#0B0E14] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
                <span className="text-[10px] sm:text-xs font-black text-gray-500 group-hover:text-white transition-colors uppercase tracking-widest">{u.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 relative z-10">
        <ActionCard 
          icon={<Heart className="w-5 h-5 text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" />} 
          title="Matches" 
          desc="See who liked you"
          onClick={() => navigate("/likes")}
          color="pink"
        />
        <ActionCard 
          icon={<Globe className="w-5 h-5 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />} 
          title="Explore" 
          desc="Find users worldwide"
          onClick={() => navigate("/video")}
          color="blue"
        />
        <ActionCard 
          icon={<Star className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />} 
          title="Favorites" 
          desc="Your saved people"
          onClick={() => navigate("/favorites")}
          color="yellow"
        />
      </div>

    </div>
  );
};

const ActionCard = ({ icon, title, desc, onClick, color }) => {
  const colorMap = {
    pink: "hover:border-pink-500/50 hover:shadow-pink-500/10",
    blue: "hover:border-blue-500/50 hover:shadow-blue-500/10",
    yellow: "hover:border-yellow-500/50 hover:shadow-yellow-500/10",
    purple: "hover:border-purple-500/50 hover:shadow-purple-500/10"
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-[#151923]/80 backdrop-blur-sm border border-[#1e293b] p-5 rounded-[24px] sm:rounded-[32px] flex items-center justify-between group cursor-pointer transition-all duration-500 shadow-xl ${colorMap[color] || "hover:border-purple-500/50"}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0B0E14] flex items-center justify-center border border-[#1e293b] group-hover:scale-110 transition-transform shadow-inner">
          {icon}
        </div>
        <div>
          <h4 className="text-sm sm:text-base text-white font-black group-hover:text-purple-400 transition-colors uppercase tracking-tight">{title}</h4>
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">{desc}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
    </div>
  );
};

export default Home;