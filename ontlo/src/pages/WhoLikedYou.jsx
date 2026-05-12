import { Users, Heart, Loader2, ShieldCheck, Sparkles, ChevronLeft, UserPlus, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";

const WhoLikedYou = () => {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, socket } = useSocket();
  const navigate = useNavigate();

  const fetchLikes = async (showLoader = false) => {
    if (showLoader) setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`${API_URL}/api/interactions/received`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setLikes(data);
      } catch (err) {
        console.error("Failed to fetch likes", err);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchLikes(true);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const refreshLikes = () => fetchLikes(false);
    socket.on("new-like", refreshLikes);
    socket.on("new-match", refreshLikes);

    return () => {
      socket.off("new-like", refreshLikes);
      socket.off("new-match", refreshLikes);
    };
  }, [socket]);

  return (
    <div className="h-full bg-[#0B0E14] relative overflow-hidden flex flex-col">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-pink-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-xl p-6 md:p-10 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
              Interested <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">In You</span>
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Discover your secret admirers</p>
          </div>
        </div>
        
        {!user?.isPremium && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Premium Only</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-20 z-10 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Scanning Admirers</p>
          </div>
        ) : likes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
              <Heart className="w-10 h-10 text-gray-700" />
            </div>
            <h2 className="text-xl font-black text-white mb-3 uppercase tracking-tighter">No Likes Yet</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-medium mb-8">
              Don't worry! Keep being active and your profile will soon get the attention it deserves.
            </p>
            <button 
              onClick={() => navigate("/video")}
              className="px-8 py-3.5 bg-gradient-to-tr from-purple-600 to-pink-600 text-white font-black rounded-2xl shadow-xl shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              Start Matching
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {likes.map((like) => (
              <div 
                key={like._id}
                className="group relative aspect-[3/4] rounded-[24px] md:rounded-[32px] overflow-hidden border border-white/10 bg-[#151923] shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
              >
                {/* Profile Pic with Blur if not premium */}
                <div className="absolute inset-0">
                  <img 
                    src={like.fromUser.profilePic} 
                    alt="Admirer"
                    className={`w-full h-full object-cover transition-all duration-700 ${!user?.isPremium ? 'blur-[30px] grayscale brightness-50' : 'group-hover:scale-110'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-transparent opacity-80"></div>
                </div>

                {/* Info Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 flex flex-col">
                  {user?.isPremium ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight truncate">
                          {like.fromUser.username}, {like.fromUser.age}
                        </h3>
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                        {like.fromUser.gender} • {new Date(like.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                      <button className="w-full py-2.5 bg-white text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-2">
                        <UserPlus className="w-3 h-3" /> Connect
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                      </div>
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Hidden Profile</h3>
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-4">Upgrade to Reveal</p>
                    </div>
                  )}
                </div>

                {/* Premium Badge if not premium */}
                {!user?.isPremium && (
                  <div className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Premium CTA Card if not premium */}
            {!user?.isPremium && (
              <div className="aspect-[3/4] rounded-[24px] md:rounded-[32px] overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6 flex flex-col items-center justify-center text-center shadow-2xl relative group cursor-pointer hover:border-purple-500/50 transition-all">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]"></div>
                <div className="relative">
                  <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2">Reveal Your Fans</h3>
                  <p className="text-[9px] font-medium text-purple-300 uppercase tracking-widest mb-6 leading-relaxed">Get Premium to see exactly who liked you and match instantly!</p>
                  <button className="w-full py-3 bg-purple-600 text-white font-black rounded-xl text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-purple-600/40">Upgrade Now</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Tip */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl z-20">
        <Info className="w-3 h-3 text-gray-500" />
        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em]">New likes appear here in real-time</p>
      </div>
    </div>
  );
};

export default WhoLikedYou;
