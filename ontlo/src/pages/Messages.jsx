import { Search, Edit, Loader2, MessageSquare, Heart, ChevronLeft, MoreVertical, Plus } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API_URL, { apiFetch } from "../utils/api";
import { useSocket } from "../context/SocketContext";
import ChatPanel from "../components/chat/ChatPanel";

const Messages = () => {
  const [connections, setConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [perChatCounts, setPerChatCounts] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();

  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/notifications/counts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setPerChatCounts(data.perChat || {});
    } catch (err) {}
  };

  useEffect(() => {
    const handleResize = () => {
      if (selectedConnection && window.innerWidth < 768) {
        document.body.classList.add('hide-bottom-nav');
      } else {
        document.body.classList.remove('hide-bottom-nav');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('hide-bottom-nav');
    };
  }, [selectedConnection, location.pathname]);

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/connections`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setConnections(data);
        setFilteredConnections(data);
        
        // Priority 1: ID from navigation state (Connections page)
        const stateId = location.state?.selectId;
        if (stateId) {
          const target = data.find(c => c.id === stateId);
          if (target) setSelectedConnection(target);
        } 
        // Priority 2: Auto-select first one on desktop only
        else if (data.length > 0 && window.innerWidth > 768) {
          setSelectedConnection(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchCounts();
  }, [location.state]);

  useEffect(() => {
    if (!socket) return;
    
    const refreshAll = () => {
      fetchConnections();
      fetchCounts();
    };

    socket.on("notification-update", refreshAll);
    socket.on("connect", refreshAll);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshAll();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      socket.off("notification-update", refreshAll);
      socket.off("connect", refreshAll);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [socket]);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredConnections(
      connections.filter(c => c.user.username.toLowerCase().includes(query))
    );
  };

  return (
    <div className="flex h-full bg-transparent overflow-hidden relative">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/5 blur-[100px] pointer-events-none"></div>

      {/* User List Pane */}
      <div className={`w-full md:w-96 flex flex-col h-full bg-[#0B0E14] z-10 transition-all duration-300 ${selectedConnection ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-black text-white tracking-tight">Messages</h1>
            <button onClick={() => navigate("/video")} className="w-10 h-10 rounded-full bg-[#151923] border border-[#1e293b] flex items-center justify-center text-white hover:bg-[#1e293b] transition shadow-lg">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500" />
            </div>
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={handleSearch}
              autoComplete="off"
              spellCheck={false}
              data-gramm="false"
              className="w-full bg-[#151923] border border-[#1e293b] text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-purple-500/50 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {loading ? (
            <div className="space-y-4 px-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 mx-2">
                  <Skeleton circle={true} className="w-14 h-14" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-24 h-3 rounded-full" />
                    <Skeleton className="w-32 h-2 rounded-full opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center p-12 bg-[#151923]/20 rounded-3xl mx-4 border border-[#1e293b]/50 border-dashed">
              <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-30" />
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No conversations</p>
            </div>
          ) : (
            filteredConnections.map((conn) => (
              <div 
                key={conn.id} 
                onClick={() => setSelectedConnection(conn)}
                className={`p-4 mx-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${selectedConnection?.id === conn.id ? 'bg-[#151923] shadow-lg border border-[#1e293b]/50' : 'hover:bg-[#151923]/40'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-full p-0.5 ${conn.user.onlineStatus ? 'bg-gradient-to-b from-green-500 to-transparent' : 'bg-[#1e293b]'}`}>
                      <img src={conn.user.profilePic || "https://i.pravatar.cc/150"} alt={conn.user.username} loading="lazy" className="w-full h-full rounded-full object-cover border-2 border-[#0B0E14]" />
                    </div>
                    {conn.user.onlineStatus && <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#0B0E14] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-white font-black mb-0.5 truncate uppercase tracking-tight">{conn.user.username}</h3>
                    <p className={`text-xs truncate w-40 ${selectedConnection?.id === conn.id ? 'text-purple-400 font-bold' : 'text-gray-500 font-medium'}`}>
                      {conn.user.onlineStatus ? 'Active now' : 'Tap to message'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {perChatCounts[conn.id] > 0 && selectedConnection?.id !== conn.id && (
                    <span className="bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-pink-500/20 animate-pulse">
                      {perChatCounts[conn.id]}
                    </span>
                  )}
                  {selectedConnection?.id !== conn.id && <div className="w-2 h-2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Pane */}
      <div className={`flex-1 h-full bg-[#0B0E14] z-20 ${!selectedConnection && 'hidden md:flex'}`}>
        {selectedConnection ? (
          <div className="h-full flex flex-col w-full animate-in slide-in-from-right-4 duration-300">
            <div className="flex-1 overflow-hidden relative">
              <ChatPanel 
                connectionId={selectedConnection.id} 
                remoteUser={selectedConnection.user} 
                onClose={() => setSelectedConnection(null)} 
                isStandaloneChat={true}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0B0E14] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05),transparent_70%)]"></div>
            <div className="relative">
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-purple-600/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-8 shadow-2xl animate-pulse">
                <MessageSquare className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase">Your Inbox</h2>
              <p className="text-gray-400 text-sm max-w-xs mx-auto font-medium leading-relaxed uppercase tracking-widest opacity-60">Select a conversation to start chatting with your connections.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Messages;
