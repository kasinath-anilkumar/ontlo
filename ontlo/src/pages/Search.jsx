import { ChevronLeft, Loader2, Search as SearchIcon, User } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";

const UserRow = ({ item, onOpenProfile }) => {
  const [status, setStatus] = useState(item.connectionStatus || 'none');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch connection status on mount if not provided (e.g. from discover)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await apiFetch(`${API_URL}/api/users/${item._id}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.connectionStatus || 'none');
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (item.connectionStatus === undefined) {
      fetchStatus();
    } else {
      setStatus(item.connectionStatus);
    }
  }, [item._id, item.connectionStatus]);

  // Real-time connection updates
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleNewMatch = (payload) => {
      if (payload.userId === item._id || payload.matchedUser?._id === item._id) {
        setStatus('active');
      }
    };
    
    const handleNewConnection = (connection) => {
      const users = typeof connection.users[0] === 'object' ? connection.users.map(u => u._id || u) : connection.users;
      if (users.includes(item._id)) {
        setStatus('active');
      }
    };

    const handleNotification = (notif) => {
      if ((notif.type === 'like' || notif.type === 'connection_request') && (notif.fromUser?._id === item._id || notif.fromUser === item._id)) {
        setStatus('pending_received');
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
  }, [socket, item._id]);

  const handleConnect = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/interactions/${item._id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isMatch) {
          setStatus('active');
        } else {
          setStatus('pending_sent');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/interactions/accept/${item._id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setStatus('active');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={() => navigate("/profile", { state: { userProfile: item } })}
      className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] active:bg-white/[0.04] transition-all rounded-2xl cursor-pointer"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-white/5">
            {item.profilePic ? (
              <img src={item.profilePic} alt={item.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#151923] flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
            )}
          </div>
          {item.onlineStatus === 'online' && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0B0E14]" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col text-left">
          <span className="text-sm font-bold text-white tracking-tight">{item.username}</span>
          <span className="text-xs text-gray-400 font-medium">{item.fullName || 'Member'}</span>
        </div>
      </div>

      {/* Button */}
      <div className="shrink-0">
        {status === 'active' && (
          <button 
            onClick={(e) => { e.stopPropagation(); navigate("/messages"); }}
            className="px-4 py-1.5 rounded-full border border-white/10 hover:bg-white/5 text-xs font-bold text-white tracking-tight active:scale-95 transition-all"
          >
            Message
          </button>
        )}
        {status === 'pending_sent' && (
          <button 
            disabled
            className="px-4 py-1.5 rounded-full border border-white/5 text-xs font-bold text-gray-500 tracking-tight cursor-not-allowed"
          >
            Requested
          </button>
        )}
        {status === 'pending_received' && (
          <button 
            onClick={handleAccept}
            disabled={loading}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-xs font-bold text-white tracking-tight active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept"}
          </button>
        )}
        {status === 'none' && (
          <button 
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white tracking-tight active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
};

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  // Fetch Suggestions (Discover Users)
  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/users/discover`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSuggestions(data);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setResults(data);
    } catch (err) {
      console.error("Failed to search users", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Update status in real-time
  useEffect(() => {
    if (!socket) return;

    const handleOnlineStatus = ({ userId, isOnline }) => {
      const id = userId?.toString();
      const updateList = (list) => list.map((user) => (
        user._id?.toString() === id
          ? { ...user, onlineStatus: isOnline ? "online" : "offline" }
          : user
      ));
      setResults((prev) => updateList(prev));
      setSuggestions((prev) => updateList(prev));
    };

    socket.on("online-status-change", handleOnlineStatus);

    return () => {
      socket.off("online-status-change", handleOnlineStatus);
    };
  }, [socket]);

  return (
    <div className="h-full bg-[#0B0E14] flex flex-col overflow-hidden">
      
      {/* Instagram style minimal search bar header */}
      <div className="sticky top-0 z-40 bg-[#0B0E14]/95 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#1A1F2C] border border-white/5 text-white rounded-full py-2 pl-10 pr-4 text-sm placeholder-gray-500 focus:outline-none focus:border-white/10 transition-all font-medium"
          />
          <SearchIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Searching...</span>
          </div>
        ) : query.trim() === "" ? (
          /* Explore suggestions (Instagram explorer style) */
          <div className="mt-4 flex flex-col">
            <div className="px-2 pb-2">
              <h2 className="text-sm font-bold text-white text-left tracking-wide">Suggested</h2>
            </div>
            {loadingSuggestions ? (
              <div className="flex justify-center py-10 opacity-30">
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No suggestions available.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {suggestions.map((user) => (
                  <UserRow 
                    key={user._id} 
                    item={user} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
            <span className="text-sm text-gray-500 font-medium">No results found for "{query}"</span>
          </div>
        ) : (
          /* Search results list */
          <div className="mt-4 flex flex-col gap-1">
            {results.map((user) => (
              <UserRow 
                key={user._id} 
                item={user} 
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Search;
