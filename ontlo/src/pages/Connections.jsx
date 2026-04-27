import { Heart, MessageSquare, Loader2, MoreVertical, ShieldAlert, UserX, X, MapPin, Calendar, Users, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileModal from "../components/profile/ProfileModal";
import API_URL from "../utils/api";

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const navigate = useNavigate();

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/connections`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setConnections(data);
      }
    } catch (err) {
      console.error("Failed to fetch connections", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const removeConnection = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this connection?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/connections/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchConnections();
    } catch (err) {
      console.error(err);
    }
    setActiveMenu(null);
  };

  const blockUser = async (userId, connectionId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to block this user? They will be removed from your connections.")) return;
    
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/users/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ blockedUserId: userId })
      });
      fetchConnections();
    } catch (err) {
      console.error(err);
    }
    setActiveMenu(null);
  };

  return (
    <div className="h-full bg-transparent p-4 lg:p-10 overflow-y-auto w-full max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">Connections</h1>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && connections.length === 0 && (
        <div className="text-center py-20 bg-[#151923]/50 rounded-[40px] border border-[#1e293b] border-dashed">
          <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">No connections yet</h3>
          <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6">Start video chatting to find people you click with!</p>
          <button onClick={() => navigate("/video")} className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:opacity-90 transition">
            Start Matching
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-1">
        {connections.map((conn) => (
          <div 
            key={conn.id} 
            onClick={() => navigate("/messages", { state: { selectId: conn.id } })}
            className="p-4 mx-2 rounded-2xl hover:bg-[#151923] cursor-pointer transition flex items-center justify-between group border border-transparent hover:border-[#1e293b]/30"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-14 h-14 rounded-full p-0.5 ${conn.user.onlineStatus ? 'bg-gradient-to-b from-green-500 to-transparent' : 'bg-[#1e293b]'}`}>
                  <img src={conn.user.profilePic || "https://i.pravatar.cc/150"} alt={conn.user.username} loading="lazy" className="w-full h-full rounded-full object-cover border-2 border-[#0B0E14]" />
                </div>
                {conn.user.onlineStatus && <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#0B0E14] rounded-full"></div>}
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-tight mb-0.5">{conn.user.username}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${conn.user.onlineStatus ? 'text-green-500' : 'text-gray-500'}`}>
                  {conn.user.onlineStatus ? "Online now" : "Offline"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); navigate("/messages", { state: { selectId: conn.id } }); }}
                className="p-3 rounded-full bg-[#151923] text-purple-400 hover:scale-110 transition-transform shadow-lg border border-[#1e293b]/50"
              >
                 <MessageSquare className="w-5 h-5" />
              </button>
              
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === conn.id ? null : conn.id); }}
                  className="p-3 rounded-full hover:bg-[#151923] text-gray-400 transition"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {activeMenu === conn.id && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }}></div>
                    <div className="absolute right-0 top-12 w-48 bg-[#151923] border border-[#1e293b] rounded-2xl shadow-2xl z-30 py-2 overflow-hidden animate-in zoom-in-95 duration-200">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedProfile(conn.user._id); setActiveMenu(null); }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#1e293b] hover:text-white flex items-center gap-2 transition"
                      >
                        <Users className="w-4 h-4 text-purple-400" /> View Profile
                      </button>
                      <button 
                        onClick={(e) => removeConnection(conn.id, e)}
                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#1e293b] hover:text-white flex items-center gap-2 transition"
                      >
                        <UserX className="w-4 h-4 text-orange-400" /> Remove Connection
                      </button>
                      <div className="h-px w-full bg-[#1e293b] my-1"></div>
                      <button 
                        onClick={(e) => blockUser(conn.user._id, conn.id, e)}
                        className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition"
                      >
                        <ShieldAlert className="w-4 h-4" /> Block User
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ProfileModal 
        userId={selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
        onMessage={() => navigate("/messages", { state: { selectId: connections.find(c => c.user._id === selectedProfile)?.id } })}
      />
    </div>
  );
};

export default Connections;
