import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import API_URL, { apiFetch } from '../utils/api';
import { X, MessageSquare, Bell } from 'lucide-react';

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

  // Centralized Global State
  const [counts, setCounts] = useState({ messages: 0, notifications: 0, perChat: {} });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isFetchingRef = useRef(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (notification) => {
    setToast(notification);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

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

    // Global Listeners
    newSocket.on('counts-update', (data) => setCounts(data));
    newSocket.on('online-users-update', (data) => setOnlineUsers(data));
    
    // Rich Toast Notification Listener
    newSocket.on('new-notification', (notification) => {
      showToast(notification);
    });

    return () => {
      newSocket.off('counts-update');
      newSocket.off('online-users-update');
      newSocket.off('new-notification');
      newSocket.disconnect();
    };
  }, [user?._id, user?.id]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      counts, 
      setCounts,
      onlineUsers, 
      setOnlineUsers,
      user, 
      setUser,
      isInitialLoad
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
