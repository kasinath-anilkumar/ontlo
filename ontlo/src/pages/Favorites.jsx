import { Star, Heart, Loader2, ChevronLeft, MessageSquare, Trash2, UserPlus, Info, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSocket();
  const navigate = useNavigate();

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/interactions/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setFavorites(data);
    } catch (err) {
      console.error("Failed to fetch favorites", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const toggleFavorite = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/interactions/favorites/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(f => f._id !== userId));
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };

  return (
    <div className="h-full bg-[#0B0E14] relative overflow-hidden flex flex-col">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-pink-600/10 blur-[100px] rounded-full pointer-events-none animate-pulse"></div>

      {/* Header */}
      <div className="p-6 md:p-10 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Favorites</span>
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Your top connections, one tap away</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-full">
          <Star className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{favorites.length} Saved</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-20 z-10 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Retrieving Favorites</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
              <Star className="w-10 h-10 text-gray-700" />
            </div>
            <h2 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">Your list is empty</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-medium mb-8">
              Start matching and favorite the users you really like to keep them safe and accessible here.
            </p>
            <button 
              onClick={() => navigate("/video")}
              className="px-8 py-3.5 border border-white/10 text-white font-black rounded-2xl hover:bg-white hover:text-black transition-all uppercase text-xs tracking-widest"
            >
              Discover People
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {favorites.map((fav) => (
              <div 
                key={fav._id}
                className="group relative aspect-[3/4] rounded-[24px] md:rounded-[32px] overflow-hidden border border-white/10 bg-[#151923] shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
              >
                {/* Profile Pic */}
                <div className="absolute inset-0">
                  <img 
                    src={fav.profilePic} 
                    alt={fav.username}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent opacity-80"></div>
                </div>

                {/* Status Badge */}
                {fav.onlineStatus && (
                  <div className="absolute top-4 left-4 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-full backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Online</span>
                    </div>
                  </div>
                )}

                {/* Favorite Toggle */}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(fav._id); }}
                  className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-yellow-500 hover:scale-110 active:scale-90 transition-all z-20"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>

                {/* Info Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 flex flex-col">
                  <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight truncate mb-1">
                    {fav.username}, {fav.age}
                  </h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    {fav.gender} • {fav.location || 'Global'}
                  </p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate("/messages", { state: { selectId: fav._id } })}
                      className="flex-1 py-2.5 bg-white text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-xl"
                    >
                      <MessageSquare className="w-3 h-3" /> Chat
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Tip */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl z-20">
        <Sparkles className="w-3 h-3 text-yellow-500" />
        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em]">Favorites are private and only visible to you</p>
      </div>
    </div>
  );
};

export default Favorites;
