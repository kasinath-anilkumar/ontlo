import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import API_URL from '../utils/api';

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
    const token = localStorage.getItem('token');
    
    const newSocket = io(API_URL, {
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
  }, [user]); // Re-connect when user state changes (login/logout)

  return (
    <SocketContext.Provider value={{ socket, activeRoomId, setActiveRoomId, user, setUser }}>
      {children}
    </SocketContext.Provider>
  );
};
