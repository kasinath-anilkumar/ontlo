import { ChevronLeft, Loader2, Search as SearchIcon, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";

const getPayloadUserId = (payload) => (
  payload?.user?._id ||
  payload?.userId ||
  payload?.matchedUser?._id ||
  payload?.fromUser?._id ||
  payload?.fromUser ||
  null
);

const UserRow = ({ item, onStatusChange }) => {
  const [status, setStatus] = useState(item.connectionStatus || 'none');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const updateStatus = useCallback((nextStatus) => {
    setStatus(nextStatus);
    onStatusChange?.(item._id, nextStatus);
  }, [item._id, onStatusChange]);

  // Fetch connection status on mount if not provided (e.g. from discover)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await apiFetch(`${API_URL}/api/users/${item._id}`);
        if (response.ok) {
          const data = await response.json();
          updateStatus(data.connectionStatus || 'none');
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (item.connectionStatus === undefined) {
      fetchStatus();
    } else {
      setStatus(item.connectionStatus || 'none');
    }
  }, [item._id, item.connectionStatus, updateStatus]);

  // Real-time connection updates
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleNewMatch = (payload) => {
      if (getPayloadUserId(payload)?.toString() === item._id?.toString()) {
        updateStatus('active');
      }
    };

    const handleNewConnection = (connection) => {
      const connectionUserId =
        connection?.user?._id ||
        connection?.users?.find?.((user) => (user?._id || user)?.toString() === item._id?.toString());

      if (connectionUserId?.toString() === item._id?.toString()) {
        updateStatus(connection.status === 'blocked' ? 'blocked' : 'active');
      }
    };

    const handleNotification = (notif) => {
      if (
        (notif.type === 'like' || notif.type === 'connection_request') &&
        getPayloadUserId(notif)?.toString() === item._id?.toString()
      ) {
        updateStatus('pending_received');
      }
    };

    const handleRequestCancelled = (payload) => {
      if (payload?.fromUserId?.toString() === item._id?.toString()) {
        updateStatus('none');
      }
    };

    socket.on('new-match', handleNewMatch);
    socket.on('new-connection', handleNewConnection);
    socket.on('new-notification', handleNotification);
    socket.on('connection-request-cancelled', handleRequestCancelled);

    return () => {
      socket.off('new-match', handleNewMatch);
      socket.off('new-connection', handleNewConnection);
      socket.off('new-notification', handleNotification);
      socket.off('connection-request-cancelled', handleRequestCancelled);
    };
  }, [socket, item._id, updateStatus]);

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
          updateStatus('active');
        } else {
          updateStatus('pending_sent');
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
        updateStatus('active');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/interactions/${item._id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        updateStatus('none');
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
            onClick={handleCancelRequest}
            disabled={loading}
            className="px-4 py-1.5 rounded-full border border-white/10 hover:bg-white/5 text-xs font-bold text-gray-400 hover:text-white tracking-tight active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Requested"}
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

  const updateUserStatus = useCallback((userId, connectionStatus) => {
    const updateList = (list) => list.map((user) => (
      user._id?.toString() === userId?.toString()
        ? { ...user, connectionStatus }
        : user
    ));

    setResults((prev) => updateList(prev));
    setSuggestions((prev) => updateList(prev));
  }, []);

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
      <div className="sticky top-0 z-40 bg-[#0B0E14]/95 backdrop-blur-xl px-4 py-4 flex items-center gap-3 shrink-0">
        {/* <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button> */}

        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Find connections..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#1A1F2C] border border-white/5 text-white rounded-full py-2 pl-10 pr-4 text-sm placeholder-gray-500 focus:outline-none focus:border-white/10 transition-all font-medium"
          />
          <SearchIcon className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 h-screen overflow-y-auto px-4 pb-20 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col gap-2 mt-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-2 py-2 rounded-2xl"
              >
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/[0.02]">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                </div>

                {/* Text */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="relative h-3 w-28 rounded-full overflow-hidden bg-white/[0.02]">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                  </div>

                  <div className="relative h-2.5 w-20 rounded-full overflow-hidden bg-white/[0.015]">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim() === "" ? (
          /* Explore suggestions (Instagram explorer style) */
          <div className="mt-4 flex flex-col">
            <div className="px-2 pb-2">
              <h2 className="text-xs font-thin text-white text-left tracking-wide">Suggested</h2>
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
                    onStatusChange={updateUserStatus}
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
                onStatusChange={updateUserStatus}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Search;
