import { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const response = await apiFetch(`${API_URL}/api/auth/me`);
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          localStorage.setItem('user', JSON.stringify(data));
        } else {
          // If the token is invalid, apiFetch will already handle the logout
          // but we can be extra sure here
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/auth';
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const newSocket = io(API_URL, {
      withCredentials: true,
      auth: { token }
    });
    
    setSocket(newSocket);

    newSocket.on('match-found', ({ roomId }) => {
      setActiveRoomId(roomId);
    });

    newSocket.on('match-ended', () => {
      setActiveRoomId(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]); // Re-connect when user id changes

  return (
    <SocketContext.Provider value={{ socket, activeRoomId, setActiveRoomId, user, setUser }}>
      {children}
    </SocketContext.Provider>
  );
};
