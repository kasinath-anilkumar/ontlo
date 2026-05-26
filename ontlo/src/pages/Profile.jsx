import {
  Camera,
  ChevronLeft,
  Settings as SettingsIcon,
  BadgeCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  MoreHorizontal,
  MessageSquare,
  Image as ImageIcon,
  Star,
  Heart,
  Users,
  Plus,
  Loader2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";
import PostFeed from "../components/PostFeed";

const Profile = () => {
  const { user, setUser, connections, socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const profileUserFromState = location.state?.userProfile;
  const isSelf = !profileUserFromState || profileUserFromState?._id === user?._id;
  const [profileUser, setProfileUser] = useState(isSelf ? user : profileUserFromState);
  const [actionLoading, setActionLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [moments, setMoments] = useState([]);
  const [loadingMoments, setLoadingMoments] = useState(true);
  const [viewingPostId, setViewingPostId] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  useEffect(() => {
    if (!isSelf && profileUserFromState?._id) {
       const fetchProfile = async () => {
          try {
             const token = localStorage.getItem("token");
             const response = await apiFetch(`${API_URL}/api/users/${profileUserFromState._id}`, {
               headers: { Authorization: `Bearer ${token}` }
             });
             if (response.ok) {
                const data = await response.json();
                setProfileUser(data);
             }
          } catch(err) {
             console.error(err);
          }
       };
       fetchProfile();
    } else if (isSelf) {
       setProfileUser(user);
    }
  }, [isSelf, profileUserFromState?._id, user]);

  // Realtime updates for connection status
  useEffect(() => {
    if (!socket || isSelf || !profileUser) return;

    const handleNewMatch = (payload) => {
      if (payload.userId === profileUser._id || payload.matchedUser?._id === profileUser._id) {
        setProfileUser(prev => prev ? { ...prev, connectionStatus: 'active' } : null);
      }
    };
    
    const handleNewConnection = (connection) => {
      const users = typeof connection.users[0] === 'object' ? connection.users.map(u => u._id || u) : connection.users;
      if (users.includes(profileUser._id)) {
        setProfileUser(prev => prev ? { ...prev, connectionStatus: 'active' } : null);
      }
    };

    const handleNotification = (notif) => {
      if ((notif.type === 'like' || notif.type === 'connection_request') && (notif.fromUser?._id === profileUser._id || notif.fromUser === profileUser._id)) {
        setProfileUser(prev => prev ? { ...prev, connectionStatus: 'pending_received' } : null);
      }
    };

    socket.on('new-match', handleNewMatch);
    socket.on('new-connection', handleNewConnection);
    socket.on('new-notification', handleNotification);

    return () => {
      socket.off('new-match', handleNewMatch);
      socket.off('new-connection', handleNewConnection);
      socket.off('new-notification', handleNotification);
    };
  }, [socket, isSelf, profileUser?._id]);

  useEffect(() => {
    if (!profileUser?._id) return;
    const fetchMoments = async () => {
      try {
        const token = localStorage.getItem("token");
        const endpoint = isSelf
          ? `${API_URL}/api/posts/my-posts`
          : `${API_URL}/api/posts/user/${profileUser._id}`;
        const res = await apiFetch(endpoint, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMoments(data);
        }
      } catch (err) {
        console.error("Fetch moments error:", err);
      } finally {
        setLoadingMoments(false);
      }
    };
    const fetchFavorites = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`${API_URL}/api/interactions/favorites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFavorites(data);
        }
      } catch (err) {
        console.error("Fetch favorites error:", err);
      } finally {
        setLoadingFavorites(false);
      }
    };
    fetchMoments();
    if (isSelf) {
      fetchFavorites();
    } else {
      setLoadingFavorites(false);
    }
  }, [isSelf, profileUser?._id]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append("image", file);
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/upload/profile-pic`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: data
      });
      const result = await response.json();
      if (response.ok) {
        const updateRes = await apiFetch(`${API_URL}/api/users/profile/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ profilePic: result.url }),
        });
        if (updateRes.ok) {
          const updatedUser = await updateRes.json();
          setUser({ ...user, ...updatedUser });
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/interactions/${profileUser._id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfileUser(prev => ({ ...prev, connectionStatus: data.isMatch ? 'active' : 'pending_sent' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/interactions/accept/${profileUser._id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setProfileUser(prev => ({ ...prev, connectionStatus: 'active' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/interactions/decline/${profileUser._id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setProfileUser(prev => ({ ...prev, connectionStatus: 'none' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionButtons = (isDesktop = false) => {
    if (isSelf) return null;
    
    if (profileUser?.connectionStatus === 'active') {
      return (
        <button
          onClick={() => navigate("/messages", { state: { selectId: profileUser._id } })}
          className={`flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isDesktop ? 'px-5 h-10 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90' : 'flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm py-3 rounded-2xl shadow-[0_4px_20px_rgba(168,85,247,0.3)]'}`}
        >
          <MessageSquare size={isDesktop ? 15 : 18} />
          <span>Message {isDesktop ? '' : profileUser.username}</span>
        </button>
      );
    }
    
    if (profileUser?.connectionStatus === 'pending_sent') {
      return (
        <button
          disabled
          className={`flex items-center justify-center gap-2 cursor-not-allowed border border-white/10 text-gray-400 font-bold ${isDesktop ? 'px-5 h-10 rounded-full bg-white/5 text-sm' : 'flex-1 bg-white/5 text-sm py-3 rounded-2xl'}`}
        >
          <span>Requested</span>
        </button>
      );
    }
    
    if (profileUser?.connectionStatus === 'pending_received') {
      return (
        <div className={`flex gap-2 ${isDesktop ? '' : 'w-full'}`}>
          <button
            onClick={handleAccept}
            disabled={actionLoading}
            className={`flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 ${isDesktop ? 'px-4 h-10 rounded-full bg-purple-600 text-white text-sm hover:bg-purple-700' : 'flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm py-3 rounded-2xl'}`}
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!actionLoading && <span>Accept</span>}
          </button>
          <button
            onClick={handleDecline}
            disabled={actionLoading}
            className={`flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 border border-white/10 text-white hover:bg-white/10 ${isDesktop ? 'px-4 h-10 rounded-full bg-white/5 text-sm' : 'flex-1 bg-white/5 text-sm py-3 rounded-2xl'}`}
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!actionLoading && <span>Decline</span>}
          </button>
        </div>
      );
    }
    
    // Default none
    return (
      <button
        onClick={handleConnect}
        disabled={actionLoading}
        className={`flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 ${isDesktop ? 'px-5 h-10 rounded-full bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700' : 'flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm py-3 rounded-2xl shadow-[0_4px_20px_rgba(168,85,247,0.3)]'}`}
      >
        {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!actionLoading && <Users size={isDesktop ? 15 : 18} />}
        {!actionLoading && <span>Connect</span>}
      </button>
    );
  };



  const containerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => setScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 h-screen  overflow-y-auto scrollbar-hide relative pb-20 animate-in fade-in duration-500 text-white font-sans">

      {/* Full Screen Post Feed View */}
      {viewingPostId ? (
        <div className="min-h-full  flex flex-col animate-in fade-in duration-300">
          <div className="sticky top-0 z-40 flex items-center justify-between p-3.5 px-4 bg-[#090B10]/95 backdrop-blur-xl border-b border-white/5 shadow-md">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewingPostId(null)} className="p-1 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-base font-normal text-white tracking-tight">Posts</h1>
            </div>
            <span className="text-xs font-bold text-purple-400">@{profileUser?.username || 'kasi_live'}</span>
          </div>
          <div className="flex-1 p-0 sm:p-6 scrollbar-hide">
            <div className="max-w-xl mx-auto w-full">
              <PostFeed
                initialPosts={moments}
                hideHeader={true}
                scrollToId={viewingPostId}
                onPostDeleted={(postId) => {
                  setMoments(prev => prev.filter(m => m._id !== postId));
                  setViewingPostId(null);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* TOP HEADER */}
          <div
            className={`
    sticky
    top-0
    z-40
    flex
    items-center
    justify-between
    p-4
    sm:px-8
    min-h-[64px]
    transition-all
    duration-300
    ${scrolled
                ? "backdrop-blur-2xl bg-black/30 border-b border-white/10"
                : "bg-transparent border-b border-transparent"
              }
  `}
          >
            {/* BACK BUTTON */}
            <button
              onClick={() => navigate(-1)}
              className="
      flex
      items-center
      gap-2
      text-white/60
      hover:text-white
      transition-all
      font-medium
      text-sm
      relative
      z-10
    "
            >
              <ChevronLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </button>

            {/* MOBILE TITLE */}
            <span
              className="
      sm:hidden
      absolute
      inset-0
      flex
      items-center
      justify-center
      font-semibold
      tracking-tight
      text-sm
      text-white
      pointer-events-none
    "
            >
              {isSelf ? "My Profile" : profileUser?.username}
            </span>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-3 relative z-10">
              {isSelf ? (
                <>
                  {/* CREATE POST */}
                  <button
                    onClick={() => navigate("/create-post")}
                    className="
            w-10
            h-10
            rounded-full
            border
            border-white/10
            bg-white/[0.04]
            hover:bg-white/[0.08]
            flex
            items-center
            justify-center
            text-white/70
            hover:text-white
            transition-all
            backdrop-blur-xl
          "
                    title="Create Post"
                  >
                    <Plus size={18} />
                  </button>

                  {/* SETTINGS */}
                  <button
                    onClick={() => navigate("/settings")}
                    className="
            w-10
            h-10
            rounded-full
            border
            border-white/10
            bg-white/[0.04]
            hover:bg-white/[0.08]
            flex
            items-center
            justify-center
            text-white/70
            hover:text-white
            transition-all
            backdrop-blur-xl
          "
                    title="Settings"
                  >
                    <SettingsIcon size={18} />
                  </button>
                </>
              ) : (
                renderActionButtons(true)
              )}
            </div>
          </div>

          <div className="max-w-4xl mx-auto sm:px-8 md:px-0
       sm:pt-8 space-y-5 sm:space-y-8">

            {/* HERO CARD - PREMIUM GRADIENT ON DESKTOP, SEAMLESS AMBIENT ON MOBILE */}
            <div className="relative sm:bg-gradient-to-br sm:from-[#1b1233]/40 sm:via-[#141124] sm:to-[#121420] sm:border sm:border-white/5 sm:rounded-[32px] py-4 sm:p-10 sm:shadow-2xl overflow-hidden sm:backdrop-blur-2xl">
              {/* Subtle glowing ambient orb in background */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* DESKTOP LAYOUT (Left Avatar, Right Info) / MOBILE (Centered) */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-10 relative z-10">

                {/* AVATAR WITH GLOW & ONLINE BADGE */}
                <div className="relative group flex-shrink-0">
                  <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 border-purple-500/40 p-1 group-hover:border-purple-400 transition-all shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#151923] relative">
                      <img src={profileUser?.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="Profile" />
                      {isSelf && (
                        <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                          <Camera size={24} className="text-white mb-1" />
                          <span className="text-[10px] font-bold">Change</span>
                          <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                        </label>
                      )}
                    </div>
                  </div>
                  {/* Online Green Badge */}
                  {profileUser?.onlineStatus === 'online' && (
                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-5 h-5 bg-green-500 rounded-full border-4 border-[#121420] shadow-md" />
                  )}
                </div>

                {/* IDENTITY & BIO */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight">
                        {profileUser?.fullName || profileUser?.username}
                      </h1>
                      <BadgeCheck size={22} className="text-purple-400 fill-purple-400/20" />
                    </div>
                    <p className="text-sm font-medium text-purple-400 tracking-wide">@{profileUser?.username || 'kasi_live'}</p>
                  </div>

                  {/* DEMOGRAPHICS & STATUS ROW */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-gray-300 font-medium tracking-wide">
                    {profileUser?.age && <span>{profileUser.age} Y.O</span>}
                    {profileUser?.gender && (
                      <>
                        {profileUser?.age && <span className="text-white/20">•</span>}
                        <span>{profileUser.gender}</span>
                      </>
                    )}
                    {profileUser?.location && (
                      <>
                        {(profileUser?.age || profileUser?.gender) && <span className="text-white/20">•</span>}
                        <span>{profileUser.location}</span>
                      </>
                    )}
                    <span className="text-white/20">•</span>
                    {profileUser?.onlineStatus === 'online' ? (
                      <span className="flex items-center gap-1.5 text-green-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 font-semibold">
                        Offline
                      </span>
                    )}
                  </div>

                  {/* BIO */}
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl mx-auto sm:mx-0 font-normal">
                    {profileUser?.bio || <span className="italic text-gray-500">No bio provided yet.</span>}
                  </p>

                  {/* PILLS */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                    {profileUser?.interests?.length > 0 ? (
                      profileUser.interests.map((tag) => (
                        <span key={tag} className="px-3.5 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/20 text-purple-300 font-medium text-xs tracking-wide">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No interests selected.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* LARGE SCREEN STATS FOOTER (Inside Hero Card) */}
              <div className="hidden sm:grid grid-cols-3 gap-6 pt-8 mt-8 border-t border-white/5 text-center relative z-10">
                <div>
                  <div className="text-2xl font-bold text-white">{moments.length || 0}</div>
                  <div className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wider">Posts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{favorites.length || 0}</div>
                  <div className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wider">Favorites</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{connections.length || 0}</div>
                  <div className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-wider">Connections</div>
                </div>
              </div>
            </div>

            {/* SMALL SCREEN STATS ROW (3 Separate Static Boxes) */}
            <div className="grid grid-cols-3 gap-2 sm:hidden px-1">
              <div className="bg-[#131622] border border-white/5 rounded-2xl p-2.5 text-center shadow-lg">
                <div className="text-base font-bold text-white">{moments.length || 0}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wider">Posts</div>
              </div>
              <div className="bg-[#131622] border border-white/5 rounded-2xl p-2.5 text-center shadow-lg">
                <div className="text-base font-bold text-white">{favorites.length || 0}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wider">Favorites</div>
              </div>
              <div className="bg-[#131622] border border-white/5 rounded-2xl p-2.5 text-center shadow-lg">
                <div className="text-base font-bold text-white">{connections.length || 0}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wider">Connections</div>
              </div>
            </div>

            {/* MOBILE ACTION BUTTONS */}
            <div className="flex gap-2 sm:hidden px-1">
              {isSelf ? (
                <>
                  <button
                    onClick={() => navigate("/settings")}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm py-3 rounded-2xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => navigate("/settings")}
                    className="w-12 h-12 bg-[#131622] border border-white/5 rounded-2xl flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-lg flex-shrink-0"
                  >
                    <SettingsIcon size={20} />
                  </button>
                </>
              ) : (
                renderActionButtons(false)
              )}
            </div>

            {/* STACKED CONTENT SECTION (About on top, Photos directly below on all screens) */}
            <div className="space-y-6 sm:space-y-8 pt-2">

              {/* ABOUT BOX */}
              <div className="bg-[#121522] border border-white/5 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xl">
                <h2 className="text-lg font-normal text-white tracking-tight">About</h2>

                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base text-gray-300">
                  {profileUser?.occupation && (
                    <div className="flex items-center gap-3.5 font-medium">
                      <Briefcase size={20} className="text-purple-400 flex-shrink-0" />
                      <span>{profileUser.occupation}</span>
                    </div>
                  )}
                  {profileUser?.education && (
                    <div className="flex items-center gap-3.5 font-medium">
                      <GraduationCap size={20} className="text-purple-400 flex-shrink-0" />
                      <span>{profileUser.education}</span>
                    </div>
                  )}
                  {profileUser?.location && (
                    <div className="flex items-center gap-3.5 font-medium">
                      <MapPin size={20} className="text-purple-400 flex-shrink-0" />
                      <span>Lives in {profileUser.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3.5 font-medium">
                    <Calendar size={20} className="text-purple-400 flex-shrink-0" />
                    <span>Joined {profileUser?.createdAt ? new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-3">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileUser?.languages?.length > 0 ? (
                      profileUser.languages.map((lang) => (
                        <span key={lang} className="px-3.5 py-1.5 bg-purple-950/40 border border-purple-500/20 text-purple-300 font-semibold text-xs rounded-xl">
                          {lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No languages listed.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TAB HEADERS & CONTENT SECTION */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-evenly border-b border-white/5 pb-3">
                  <div className="flex gap-16">
                    <button
                      onClick={() => setActiveTab("posts")}
                      className={`text-sm sm:text-base font-bold tracking-tight pb-2 transition-all ${activeTab === 'posts' ? 'text-white border-b-2 border-purple-500 font-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      Posts ({moments.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("favorites")}
                      className={`text-sm sm:text-base font-bold tracking-tight pb-2 transition-all ${activeTab === 'favorites' ? 'text-white border-b-2 border-purple-500 font-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      Favorites ({favorites.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("connections")}
                      className={`text-sm sm:text-base font-bold tracking-tight pb-2 transition-all ${activeTab === 'connections' ? 'text-white border-b-2 border-purple-500 font-black' : 'text-gray-500 hover:text-white'}`}
                    >
                      Connections ({connections.length})
                    </button>
                  </div>
                </div>

                {/* TAB 1: POSTS GRID */}
                {activeTab === "posts" && (
                  <div className="grid grid-cols-3 gap-1 sm:gap-1.5 animate-in fade-in duration-300">
                    {loadingMoments ? (
                      <div className="col-span-3 py-20 text-center text-gray-500 text-sm animate-pulse">Loading photos...</div>
                    ) : moments.length > 0 ? (
                      moments.map((m) => (
                        <div
                          key={m._id}
                          onClick={() => setViewingPostId(m._id)}
                          className="aspect-square bg-[#1a1f30] rounded-xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-sm"
                        >
                          <img
                            src={m.imageUrl}
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
                            alt="Photo"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 py-16 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-3xl">
                        <ImageIcon size={32} className="mx-auto mb-3 text-purple-400 opacity-60" />
                        <p className="text-sm font-bold text-white mb-1">No photos captured</p>
                        <p className="text-xs text-gray-500 font-medium">Photos uploaded to your feed will appear here</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: FAVORITES GRID */}
                {activeTab === "favorites" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in duration-300">
                    {loadingFavorites ? (
                      <div className="col-span-full py-20 text-center text-gray-500 text-sm animate-pulse">Loading favorites...</div>
                    ) : favorites.length > 0 ? (
                      favorites.map((fav) => (
                        <div
                          key={fav._id}
                          onClick={() => navigate("/messages", { state: { selectId: fav._id } })}
                          className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-[#151923] shadow-xl cursor-pointer transition-all hover:scale-[1.02]"
                        >
                          <img src={fav.profilePic} className="w-full h-full object-cover" alt={fav.username} />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent opacity-80"></div>
                          <div className="absolute bottom-0 inset-x-0 p-3">
                            <p className="text-sm font-bold text-white truncate">{fav.username}{fav.age ? `, ${fav.age}` : ''}</p>
                            <p className="text-[10px] text-purple-400 font-semibold">{fav.location || 'Connected'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-16 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-3xl">
                        <Star size={32} className="mx-auto mb-3 text-yellow-500 opacity-60" />
                        <p className="text-sm font-bold text-white mb-1">No favorite connections</p>
                        <p className="text-xs text-gray-500 font-medium">Star your favorite connections to see them here</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: CONNECTIONS LIST */}
                {activeTab === "connections" && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    {connections.length > 0 ? (
                      connections.map((conn) => (
                        <div
                          key={conn.id}
                          onClick={() => navigate("/messages", { state: { selectId: conn.id } })}
                          className="p-3 bg-[#131622] border border-white/5 rounded-2xl flex items-center justify-between hover:border-purple-500/30 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                              <img src={conn.user?.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="User" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-purple-400 transition">{conn.user?.username}</p>
                              <p className="text-xs text-gray-500 font-medium">{conn.user?.onlineStatus === 'online' ? '🟢 Online' : '⚪ Offline'}</p>
                            </div>
                          </div>
                          <button className="p-2 bg-white/5 rounded-xl text-gray-400 group-hover:text-white transition">
                            <MessageSquare size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-16 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-3xl">
                        <Heart size={32} className="mx-auto mb-3 text-purple-400 opacity-60" />
                        <p className="text-sm font-bold text-white mb-1">No connections yet</p>
                        <p className="text-xs text-gray-500 font-medium">Start video matching to connect with people</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
