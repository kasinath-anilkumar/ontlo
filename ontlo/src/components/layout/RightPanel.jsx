import { Video, MessageSquare, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../../utils/api";

const RightPanel = ({ onClose }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [recentConnections, setRecentConnections] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Fetch Online Connections
        const onlineRes = await fetch(`${API_URL}/api/connections/online`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const onlineData = await onlineRes.json();
        if (onlineRes.ok) setOnlineUsers(onlineData);

        // Fetch All Connections (for Recent)
        const connectionsRes = await fetch(`${API_URL}/api/connections`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const connectionsData = await connectionsRes.json();
        if (connectionsRes.ok) setRecentConnections(connectionsData.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch sidebar data", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return Math.floor(hours / 24) + "d ago";
  };

  return (
    <div className="w-80 bg-[#0B0E14] border-l border-white/5 flex flex-col h-screen overflow-y-auto hidden xl:flex relative">
      
      {/* Header with Close */}
      <div className="p-6 pb-2 flex justify-between items-center">
         <h1 className="text-xl font-black text-white tracking-tighter">Dashboard</h1>
         <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all group">
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
         </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Online Now Section */}
        <section className="bg-[#151923]/40 border border-white/5 rounded-[32px] p-5 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Online Now</h2>
            <button onClick={() => navigate("/connections")} className="text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest">View all</button>
          </div>

          <div className="space-y-4">
            {onlineUsers.length > 0 ? onlineUsers.map((item) => (
              <div key={item.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={item.user.profilePic || "https://i.pravatar.cc/150"} loading="lazy" className="w-12 h-12 rounded-full object-cover border-2 border-white/5 group-hover:border-purple-500/50 transition-all shadow-lg" />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-[#151923] shadow-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white leading-none mb-1.5">{item.user.username}{item.user.age ? `, ${item.user.age}` : ""}</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-green-500 font-black uppercase tracking-widest opacity-80">Online</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => navigate("/video")} className="w-10 h-10 rounded-2xl bg-[#0B0E14] border border-white/10 flex items-center justify-center text-gray-400 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-lg">
                  <Video className="w-5 h-5" />
                </button>
              </div>
            )) : (
              <p className="text-[10px] text-gray-600 font-bold uppercase text-center py-4 tracking-widest">No connections online</p>
            )}
          </div>
        </section>

        {/* Recent Connections Section */}
        <section className="bg-[#151923]/40 border border-white/5 rounded-[32px] p-5 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Recent Connections</h2>
            <button onClick={() => navigate("/connections")} className="text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest">View all</button>
          </div>

          <div className="space-y-4">
            {recentConnections.length > 0 ? recentConnections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate("/messages")}>
                <div className="flex items-center gap-3">
                  <img src={conn.user.profilePic || "https://i.pravatar.cc/150"} loading="lazy" className="w-12 h-12 rounded-full object-cover border-2 border-white/5 group-hover:border-purple-500/50 transition-all shadow-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-white truncate">{conn.user.username}</p>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter whitespace-nowrap ml-2">{formatTimeAgo(conn.lastMessage?.createdAt || conn.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate w-32 font-medium leading-tight">
                      {conn.lastMessage?.text || "Started a connection ✨"}
                    </p>
                  </div>
                </div>
                <button onClick={() => navigate("/messages")} className="w-10 h-10 rounded-2xl bg-[#0B0E14]/50 border border-white/5 flex items-center justify-center text-gray-600 group-hover:text-purple-400 group-hover:border-purple-500/20 transition-all shadow-lg">
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            )) : (
              <p className="text-[10px] text-gray-600 font-bold uppercase text-center py-4 tracking-widest">Connect with users to chat</p>
            )}
          </div>
        </section>

        {/* Safety Card matching design */}
        <div className="bg-gradient-to-br from-[#151923] to-[#0B0E14] border border-white/5 p-6 rounded-[32px] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col items-center text-center">
               <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-4 shadow-inner">
               <MessageSquare className="w-7 h-7 text-purple-500" />
            </div>
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Safety First</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium uppercase tracking-widest mb-6">
              Advanced technology and human moderation keep our community safe.
            </p>
            <button onClick={() => navigate("/profile")} className="text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all">
              Learn more about safety <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;