import { Bell, MessageSquare, X } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import API_URL, { apiFetch } from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [counts, setCounts] = useState({ messages: 0, notifications: 0, perChat: {} });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef({ connections: 0, notifications: 0 });

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (notification) => {
    setToast(notification);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const [isConnected, setIsConnected] = useState(false);

  // 1. Auth Check & Initial Data Fetch
  useEffect(() => {
    if (isFetchingRef.current) return;
    
    const initAppData = async () => {
      const token = localStorage.getItem('token');
      // If no token, we still try once to see if we have a session cookie
      // The ProtectedRoute will wait for this check to finish.

      isFetchingRef.current = true;
      try {
        const meRes = await apiFetch(`${API_URL}/api/auth/me`);
        
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData);
          localStorage.setItem('user', JSON.stringify(meData));

          // Only fetch secondary data if authenticated
          const [countsRes, onlineRes] = await Promise.all([
            apiFetch(`${API_URL}/api/notifications/counts`),
            apiFetch(`${API_URL}/api/connections/online`)
          ]);

          if (countsRes.ok) setCounts(await countsRes.json());
          if (onlineRes.ok) setOnlineUsers(await onlineRes.json());
        } else if (meRes.status === 401) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error("Initial app data fetch failed", err);
      } finally {
        isFetchingRef.current = false;
        setIsInitialLoad(false);
      }
    };

    initAppData();

    const handleAuthExpired = () => {
      setUser(null);
      setSocket(prev => {
        if (prev) prev.disconnect();
        return null;
      });
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const fetchGlobalConnections = async (force = false) => {
    // Cache for 2 minutes unless forced
    if (!force && connections.length > 0 && Date.now() - lastFetchRef.current.connections < 120000) return;
    
    try {
      const res = await apiFetch(`${API_URL}/api/connections`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
        lastFetchRef.current.connections = Date.now();
      }
    } catch (err) {
      console.error("Fetch connections failed", err);
    }
  };

  const fetchGlobalNotifications = async (force = false) => {
    // Cache for 2 minutes unless forced
    if (!force && notifications.length > 0 && Date.now() - lastFetchRef.current.notifications < 120000) return;

    try {
      const res = await apiFetch(`${API_URL}/api/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        lastFetchRef.current.notifications = Date.now();
      }
    } catch (err) {
      console.error("Fetch notifications failed", err);
    }
  };

  // 2. Real-time Socket Updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;
    
    const newSocket = io(API_URL, {
      withCredentials: true,
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
    
    setSocket(newSocket);

    // Connection Events
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));

    // Global Listeners
    newSocket.on('counts-update', (data) => setCounts(data));
    newSocket.on('counts-delta', (delta) => {
      setCounts((prev) => {
        const perChat = { ...prev.perChat };
        if (delta.perChat) {
          Object.entries(delta.perChat).forEach(([connectionId, value]) => {
            perChat[connectionId] = (perChat[connectionId] || 0) + value;
          });
        }

        return {
          messages: prev.messages + (delta.messages || 0),
          notifications: prev.notifications + (delta.notifications || 0),
          connections: prev.connections + (delta.connections || 0),
          perChat
        };
      });
    });
    newSocket.on('online-users-update', (data) => setOnlineUsers(data));

    newSocket.on('online-status-change', ({ userId, isOnline }) => {
      setConnections(prev => prev.map(conn => 
        conn.user._id === userId 
          ? { ...conn, user: { ...conn.user, onlineStatus: isOnline ? 'online' : 'offline' } } 
          : conn
      ));
    });

    newSocket.on('chat-message', (msg) => {
      setConnections(prev => {
        const updated = prev.map(conn => 
          conn.id === msg.roomId 
            ? { ...conn, lastMessage: { text: msg.text, createdAt: msg.createdAt }, updatedAt: msg.createdAt } 
            : conn
        );
        // Re-sort so the conversation with the newest message is at the top
        return [...updated].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
    });

    newSocket.on('messages-read', ({ connectionId }) => {
      setCounts(prev => {
        const chatCount = prev.perChat[connectionId] || 0;
        return {
          ...prev,
          messages: Math.max(0, prev.messages - chatCount),
          perChat: { ...prev.perChat, [connectionId]: 0 }
        };
      });
    });
    
    // Rich Toast Notification Listener
    newSocket.on('new-notification', (notification) => {
      showToast(notification);
      // Append to cache
      setNotifications(prev => [notification, ...prev].slice(0, 50));
    });

    newSocket.on('new-match', () => {
      fetchGlobalConnections(true);
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('counts-update');
      newSocket.off('online-users-update');
      newSocket.off('new-notification');
      newSocket.off('messages-read');
      newSocket.disconnect();
    };
  }, [user?._id, user?.id]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected,
      counts, 
      setCounts,
      onlineUsers, 
      setOnlineUsers,
      user, 
      setUser,
      isInitialLoad,
      connections,
      setConnections,
      fetchGlobalConnections,
      notifications,
      setNotifications,
      fetchGlobalNotifications
    }}>
      {children}
      
      {/* Premium Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[1000] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#151923]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-4 min-w-[320px] max-w-[400px]">
            <div className="relative shrink-0">
              {toast.fromUser?.profilePic ? (
                <img src={toast.fromUser.profilePic} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center border-2 border-purple-500/30">
                  {toast.type === 'message' ? <MessageSquare className="w-6 h-6 text-purple-400" /> : <Bell className="w-6 h-6 text-purple-400" />}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white rounded-full p-1 shadow-lg border border-[#151923]">
                {toast.type === 'message' ? <MessageSquare className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden pt-0.5">
              <h4 className="text-white font-black text-sm uppercase tracking-tight truncate">
                {toast.fromUser?.username || 'New Notification'}
              </h4>
              <p className="text-gray-400 text-xs font-medium line-clamp-2 mt-0.5">
                {toast.content}
              </p>
            </div>
            
            <button 
              onClick={() => setToast(null)}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
};
