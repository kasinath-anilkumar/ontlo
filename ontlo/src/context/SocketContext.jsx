import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import API_URL, { apiFetch } from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Centralized Global State
  const [counts, setCounts] = useState({ messages: 0, notifications: 0, perChat: {} });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isFetchingRef = useRef(false);

  // 1. Auth Check & Initial Data Fetch
  useEffect(() => {
    if (isFetchingRef.current) return;
    
    const initAppData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      isFetchingRef.current = true;
      try {
        // Parallel fetch of user and initial counts
        const [meRes, countsRes, onlineRes] = await Promise.all([
          apiFetch(`${API_URL}/api/auth/me`),
          apiFetch(`${API_URL}/api/notifications/counts`),
          apiFetch(`${API_URL}/api/connections/online`)
        ]);

        if (meRes.ok) {
          const userData = await meRes.json();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }

        if (countsRes.ok) setCounts(await countsRes.json());
        if (onlineRes.ok) setOnlineUsers(await onlineRes.json());
      } catch (err) {
        console.error("Initial app data fetch failed", err);
      } finally {
        setIsInitialLoad(false);
      }
    };

    initAppData();
  }, []);

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

    // Global Listeners (Shared across all components)
    newSocket.on('counts-update', (data) => setCounts(data));
    newSocket.on('online-users-update', (data) => setOnlineUsers(data));
    
    // Legacy support for specific updates
    newSocket.on('notification-update', () => {
       // Debounced re-fetch if needed, or wait for counts-update
    });

    newSocket.on('match-found', ({ roomId }) => {
      setActiveRoomId(roomId);
    });

    newSocket.on('match-ended', () => {
      setActiveRoomId(null);
    });

    return () => {
      newSocket.off('counts-update');
      newSocket.off('online-users-update');
      newSocket.disconnect();
    };
  }, [user?._id, user?.id]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      activeRoomId, 
      setActiveRoomId, 
      user, 
      setUser,
      counts,
      setCounts,
      onlineUsers,
      isInitialLoad
    }}>
      {children}
    </SocketContext.Provider>
  );
};
