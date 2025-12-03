import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Detect server URL dynamically
const getServerUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname;
    
    // Use port 4000 for backend (development)
    const backendPort = '4000';
    const url = `${protocol}//${hostname}:${backendPort}`;
    console.log('[Socket.io] Connecting to:', url);
    return url;
  }
  return 'http://localhost:4000';
};

const SERVER_URL = getServerUrl();

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(SERVER_URL, {
      transports: ['websocket'], // Force WebSocket for better performance
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to Game Server:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from Game Server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('❌ Connection Error:', err);
      console.error('Trying to connect to:', SERVER_URL);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
};