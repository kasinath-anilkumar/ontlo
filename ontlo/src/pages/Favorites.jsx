import { ChevronLeft, Loader2, MessageSquare, Search, Star, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { socket } = useSocket();
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

  useEffect(() => {
    if (!socket) return;

    const handleOnlineStatus = ({ userId, isOnline }) => {
      const id = userId?.toString();
      setFavorites((prev) => prev.map((fav) => (
        fav._id?.toString() === id
          ? { ...fav, onlineStatus: isOnline ? "online" : "offline" }
          : fav
      )));
    };

    socket.on("online-status-change", handleOnlineStatus);
    socket.on("profile-updated", fetchFavorites);

    return () => {
      socket.off("online-status-change", handleOnlineStatus);
      socket.off("profile-updated", fetchFavorites);
    };
  }, [socket]);

  const filteredFavorites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return favorites;

    return favorites.filter((fav) => (
      fav.username?.toLowerCase().includes(query) ||
      fav.fullName?.toLowerCase().includes(query)
    ));
  }, [favorites, searchQuery]);

  const toggleFavorite = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/interactions/favorites/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((fav) => fav._id !== userId));
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0B0E14] overflow-hidden" translate="no">
      <div className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-xl p-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#151923] border border-[#1e293b] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1e293b] transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Favorites</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">
              {favorites.length} saved connections
            </p>
          </div>
        </div>

        <div className="relative mb-2">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search favorites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151923] border border-[#1e293b] text-white text-sm rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-purple-500/50 transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 pt-4 pb-20 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Loading Favorites</p>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="text-center p-12 bg-[#151923]/20 rounded-3xl mx-4 border border-[#1e293b]/50 border-dashed">
            <Star className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-30" />
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
              {favorites.length === 0 ? "No favorites yet" : "No favorites found"}
            </p>
          </div>
        ) : (
          filteredFavorites.map((fav) => (
            <div
              key={fav._id}
              onClick={() => navigate("/messages", { state: { selectId: fav._id } })}
              className="p-4 rounded-2xl transition-all flex items-center justify-between group hover:bg-[#151923]/40 cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className={`w-14 h-14 rounded-full p-0.5 ${fav.onlineStatus === 'online' ? 'bg-gradient-to-b from-green-500 to-transparent' : 'bg-[#1e293b]'}`}>
                    {fav.profilePic ? (
                      <img src={fav.profilePic} alt={fav.username} loading="lazy" className="w-full h-full rounded-full object-cover border-2 border-[#0B0E14]" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#151923] border-2 border-[#0B0E14] flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  {fav.onlineStatus === 'online' && (
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#0B0E14] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  )}
                </div>

                <div className="overflow-hidden min-w-0">
                  <h3 className="text-white font-black mb-0.5 truncate font-normal sm:text-sm md:text-lg tracking-tight">
                    {fav.username}
                  </h3>
                  <p className="text-xs truncate text-gray-500 font-medium w-48">
                    {fav.fullName || (fav.onlineStatus === 'online' ? 'Active now' : 'Favorite connection')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/messages", { state: { selectId: fav._id } });
                  }}
                  className="hidden sm:flex w-10 h-10 rounded-full bg-white/5 border border-white/10 items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
                  title="Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(fav._id);
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-yellow-500 hover:bg-white/10 active:scale-95 transition"
                  title="Remove favorite"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Favorites;
