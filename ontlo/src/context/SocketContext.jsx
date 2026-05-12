import { Bell, MessageSquare, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

  const [counts, setCounts] = useState({ messages: 0, notifications: 0, connections: 0, likes: 0, perChat: {} });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef({ connections: 0, notifications: 0 });
  const connectionsRef = useRef([]);
  const messageCacheRef = useRef(new Map());

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

  const normalizeConnectionId = (connectionId) => connectionId?.toString?.() || connectionId;

  const mergeConnection = useCallback((incoming) => {
    if (!incoming?.id) return;

    setConnections((prev) => {
      const nextId = normalizeConnectionId(incoming.id);
      const existingIndex = prev.findIndex((conn) => normalizeConnectionId(conn.id) === nextId);
      const nextConnection = {
        ...(existingIndex >= 0 ? prev[existingIndex] : {}),
        ...incoming,
        id: nextId
      };

      const next = existingIndex >= 0
        ? prev.map((conn, index) => (index === existingIndex ? nextConnection : conn))
        : [nextConnection, ...prev];

      return [...next].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    });
  }, []);

  const removeConnection = useCallback((connectionId) => {
    const id = normalizeConnectionId(connectionId);
    if (!id) return;

    setConnections((prev) => prev.filter((conn) => normalizeConnectionId(conn.id) !== id));
    messageCacheRef.current.delete(id);
  }, []);

  const updateConnectionFromMessage = useCallback((msg) => {
    const connectionId = normalizeConnectionId(msg.connectionId || msg.roomId);
    if (!connectionId) return;

    const createdAt = msg.createdAt || new Date().toISOString();
    const text = msg.text || (msg.imageUrl ? 'Image' : '');

    setConnections((prev) => {
      const existingIndex = prev.findIndex((conn) => normalizeConnectionId(conn.id) === connectionId);
      if (existingIndex === -1) {
        fetchGlobalConnections(true);
        return prev;
      }

      const next = prev.map((conn, index) => (
        index === existingIndex
          ? {
              ...conn,
              lastMessage: {
                ...(conn.lastMessage || {}),
                text,
                sender: msg.sender,
                createdAt
              },
              updatedAt: createdAt
            }
          : conn
      ));

      return [...next].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    });
  }, []);

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

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

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
    newSocket.on('counts-update', (data) => {
      setCounts({
        messages: data.messages || 0,
        notifications: data.notifications || 0,
        connections: data.connections || 0,
        likes: data.likes || 0,
        perChat: data.perChat || {}
      });
    });
    newSocket.on('counts-delta', (delta) => {
      setCounts((prev) => {
        const perChat = { ...(prev?.perChat || {}) };
        if (delta.perChat) {
          Object.entries(delta.perChat).forEach(([connectionId, value]) => {
            perChat[connectionId] = (perChat[connectionId] || 0) + value;
          });
        }

        return {
          messages: Math.max(0, (prev.messages || 0) + (delta.messages || 0)),
          notifications: Math.max(0, (prev.notifications || 0) + (delta.notifications || 0)),
          connections: Math.max(0, (prev.connections || 0) + (delta.connections || 0)),
          likes: Math.max(0, (prev.likes || 0) + (delta.likes || 0)),
          perChat
        };
      });
    });
    newSocket.on('online-users-update', (data) => setOnlineUsers(data));

    newSocket.on('online-status-change', ({ userId, isOnline }) => {
      const normalizedId = userId?.toString();

      setConnections((prev) =>
        prev.map((conn) => {
          const updatedUser = conn.user?._id?.toString() === normalizedId
            ? { ...conn.user, onlineStatus: isOnline ? 'online' : 'offline' }
            : conn.user;

          const updatedUserDetails = conn.userDetails?.map((user) =>
            user._id?.toString() === normalizedId
              ? {
                  ...user,
                  onlineStatus: isOnline ? 'online' : 'offline'
                }
              : user
          );

          return {
            ...conn,
            user: updatedUser,
            userDetails: updatedUserDetails
          };
        })
      );

      setOnlineUsers((prev) => {
        if (!normalizedId) return prev;

        if (!isOnline) {
          return prev.filter(
            (item) => item.user?._id?.toString() !== normalizedId
          );
        }

        if (prev.some((item) => item.user?._id?.toString() === normalizedId)) {
          return prev;
        }

        const matchedConnection = connectionsRef.current.find((conn) =>
          conn.user?._id?.toString() === normalizedId ||
          conn.userDetails?.some((user) => user._id?.toString() === normalizedId)
        );

        if (!matchedConnection) {
          return prev;
        }

        const user = matchedConnection.user ||
          matchedConnection.userDetails?.find((u) => u._id?.toString() === normalizedId);

        if (!user) {
          return prev;
        }

        return [
          ...prev,
          {
            connectionId: matchedConnection.id || matchedConnection._id || null,
            user: {
              ...user,
              onlineStatus: 'online'
            }
          }
        ];
      });
    });

    const handleRealtimeMessage = (msg) => updateConnectionFromMessage(msg);
    newSocket.on('chat-message', handleRealtimeMessage);
    newSocket.on('new-message', handleRealtimeMessage);

    newSocket.on('messages-read', ({ connectionId }) => {
      setCounts(prev => {
        const chatCount = prev?.perChat?.[connectionId] || 0;
        return {
          ...prev,
          messages: Math.max(0, prev.messages - chatCount),
          perChat: { ...prev.perChat, [connectionId]: 0 }
        };
      });
    });

    newSocket.on('notification-read', ({ id }) => {
      setNotifications((prev) => prev.map((n) => (
        normalizeConnectionId(n._id) === normalizeConnectionId(id)
          ? { ...n, isRead: true }
          : n
      )));
      setCounts((prev) => ({
        ...prev,
        notifications: Math.max(0, (prev.notifications || 0) - 1)
      }));
    });

    newSocket.on('notifications-cleared', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setCounts((prev) => ({ ...prev, notifications: 0 }));
    });
    
    // Rich Toast Notification Listener
    newSocket.on('new-notification', (notification) => {
      showToast(notification);
      // Append to cache
      setNotifications(prev => {
        const id = normalizeConnectionId(notification._id || notification.id);
        if (id && prev.some((n) => normalizeConnectionId(n._id || n.id) === id)) {
          return prev;
        }
        return [{ ...notification, _id: id || `realtime-${Date.now()}`, isRead: notification.isRead ?? false }, ...prev].slice(0, 50);
      });
    });

    newSocket.on('notification-update', (notification) => {
      if (notification?.content) showToast(notification);
      fetchGlobalNotifications(true);
    });

    newSocket.on('new-connection', mergeConnection);
    newSocket.on('connection-updated', mergeConnection);
    newSocket.on('connection-deleted', ({ connectionId }) => {
      removeConnection(connectionId);
    });

    newSocket.on('new-like', () => {
      fetchGlobalConnections(true);
    });

    newSocket.on('new-match', (payload) => {
      if (payload?.connection) {
        mergeConnection(payload.connection);
      }
      fetchGlobalConnections(true);
      fetchGlobalNotifications(true);
    });

    newSocket.on('profile-updated', ({ userId, user: updatedProfile }) => {
      const updatedUserId = normalizeConnectionId(userId || updatedProfile?._id || updatedProfile?.id);
      if (!updatedUserId) return;

      setConnections((prev) => prev.map((conn) => {
        const connUserId = normalizeConnectionId(conn.user?._id || conn.user?.id);
        if (connUserId !== updatedUserId) return conn;

        return {
          ...conn,
          user: {
            ...conn.user,
            ...updatedProfile,
            _id: conn.user?._id || updatedProfile?._id
          }
        };
      }));
    });

    newSocket.on('force-logout', () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      newSocket.disconnect();
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('counts-update');
      newSocket.off('counts-delta');
      newSocket.off('online-users-update');
      newSocket.off('online-status-change');
      newSocket.off('new-notification');
      newSocket.off('notification-update');
      newSocket.off('notification-read');
      newSocket.off('notifications-cleared');
      newSocket.off('messages-read');
      newSocket.off('chat-message', handleRealtimeMessage);
      newSocket.off('new-message', handleRealtimeMessage);
      newSocket.off('new-connection');
      newSocket.off('connection-updated');
      newSocket.off('connection-deleted');
      newSocket.off('new-like');
      newSocket.off('new-match');
      newSocket.off('profile-updated');
      newSocket.off('force-logout');
      newSocket.disconnect();
    };
  }, [user?._id, user?.id, mergeConnection, removeConnection, updateConnectionFromMessage]);

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
      updateConnectionFromMessage,
      notifications,
      setNotifications,
      fetchGlobalNotifications,
      messageCacheRef
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
