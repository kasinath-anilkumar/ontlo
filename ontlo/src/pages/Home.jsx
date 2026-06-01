import { Bell, ChevronRight, Globe, Heart, Plus, Radio, Star, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import banner1 from "../assets/banner1.webp";
import banner2 from "../assets/banner2.webp";
import logo from "/ontlo_icon.webp";
import PostFeed from "../components/PostFeed";
import Skeleton from "../components/ui/Skeleton";
import { useSocket } from "../context/SocketContext";
import { useFeed } from "../context/FeedContext";
import API_URL, { apiFetch } from "../utils/api";

const Home = () => {
  const navigate = useNavigate();
  const { socket, user, counts, onlineUsers: contextOnlineUsers, isInitialLoad } = useSocket();
  const { posts, postsLoading, fetchFeed } = useFeed();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!socket) return;
    socket.on("online-count", ({ count }) => setOnlineCount(count));
    return () => socket.off("online-count");
  }, [socket]);

  useEffect(() => {
    fetchFeed();

    const handleRefresh = () => {
      fetchFeed(true);
    };
    window.addEventListener('app:refresh', handleRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleRefresh);
    };
  }, []);

  const hasPosts = posts.length > 0;

  return (
    <div className="flex-1 flex flex-col pt-14 md:pt-6 space-y-4 sm:space-y-6 pb-24 sm:pb-8 px-0 sm:px-6 lg:px-8 relative overflow-x-hidden scrollbar-hide md:scrollbar-default">
      {/* Background Glows */}
      {/* <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div> */}
      {/* <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-pink-600/5 blur-[100px] rounded-full pointer-events-none"></div> */}

      {/* Top Bar Header */}
      <header className="fixed md:hidden top-0 left-0 right-0 z-40 bg-[#0B0E14]/90 backdrop-blur-xl pt-4 sm:pt-0 pb-4 sm:pb-0 -mx-2 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 border-b border-white/5">
        <div className="block sm:hidden flex-shrink-0">
          <img src={logo} alt="Ontlo" className="h-8 w-auto object-contain " />
        </div>
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {isInitialLoad ? (
            <>
              <Skeleton className="w-16 h-8 rounded-xl" />
              <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl" />
              <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl" />
              <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl" />
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/create-post")}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-[#151923] border border-[#1e293b] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>

              <button onClick={() => navigate("/notifications")} className="relative w-8 h-8 sm:w-9 sm:h-9 bg-[#151923] border border-[#1e293b] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <Bell className="h-4 w-4" />
              </button>
              <button onClick={() => navigate("/profile")} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-purple-500/20 overflow-hidden bg-[#151923] flex items-center justify-center">
                {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" alt="Profile" /> : <User className="w-5 h-5 text-gray-500" />}
              </button>
            </>
          )}
        </div>
      </header>

      {postsLoading ? (
        <FeedSkeleton />
      ) : hasPosts ? (
        /* PURE FEED UI (Instagram Style) */
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 mt-4 sm:mt-4 md:mt-0">
          <PostFeed />
        </div>
      ) : (
        /* DISCOVERY HUB UI (Standard Style) */
        <div className="space-y-12 animate-in fade-in duration-700">
          {/* Discovery Banner */}
          <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0B0F1F] via-[#0E1330] to-[#140F2E] p-8 md:p-12 transition-all border border-white/5 shadow-2xl">
            <div className="relative grid md:grid-cols-2 gap-10 items-center z-20">
              <div className="space-y-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                  Start <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent italic">Connecting</span>
                </h1>
                <p className="text-white/40 max-w-sm text-xs sm:text-sm font-medium leading-relaxed">
                  Jump into a conversation and see where it leads. Meet real people.
                </p>
                <button
                  onClick={() => navigate("/video")}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-purple-500/20 hover:scale-105 transition"
                >
                  <Radio size={18} className="fill-current" />
                  <span>Connect Now</span>
                </button>
              </div>
              <div className="hidden md:flex relative justify-center">
                <div className="relative z-10 rotate-[-6deg] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                  <img src={banner1} className="w-56 h-[320px] object-cover rounded-xl" alt="Banner" />
                </div>
                <div className="absolute right-0 translate-x-12 rotate-[8deg] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
                  <img src={banner2} className="w-56 h-[320px] object-cover rounded-xl" alt="Banner" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <ActionCard icon={<Heart className="text-pink-500" />} title="Matches" desc="Who liked you" onClick={() => navigate("/who-liked-you")} color="pink" />
            <ActionCard icon={<Globe className="text-blue-500" />} title="Explore" desc="Find users" onClick={() => navigate("/video")} color="blue" />
            <ActionCard icon={<Star className="text-yellow-500" />} title="Favorites" desc="Saved people" onClick={() => navigate("/favorites")} color="yellow" />
          </div>
        </div>
      )}
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
          <h4 className="text-sm sm:text-base text-white font-black group-hover:text-purple-400 transition-colors uppercase tracking-tight"><span>{title}</span></h4>
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest"><span>{desc}</span></p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
    </div>
  );
};

const FeedSkeleton = () => (
  <div className="space-y-12 animate-in fade-in duration-500 max-w-2xl mx-auto w-full pt-0">
    {[1, 2].map((i) => (
      <div key={i} className="bg-[#151923]/40  p-4 sm:p-6 space-y-4 shadow-xl backdrop-blur-sm">
        {/* Author Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton circle className="w-10 h-10 shrink-0" />
            <div className="space-y-2">
              <Skeleton className="w-28 h-3.5" />
              <Skeleton className="w-16 h-2.5 opacity-60" />
            </div>
          </div>
          <Skeleton className="w-6 h-6 rounded-full opacity-40" />
        </div>

        {/* Caption */}
        <div className="space-y-2 pt-2">
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-3/4 h-3" />
        </div>

        {/* Media Box */}
        <Skeleton className="w-full aspect-[4/5] rounded-2xl my-4" />

        {/* Interaction bar */}
        <div className="flex items-center gap-6 pt-2">
          <Skeleton className="w-20 h-6 rounded-lg" />
          <Skeleton className="w-24 h-6 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export default Home;