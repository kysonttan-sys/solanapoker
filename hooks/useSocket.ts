import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Detect server URL dynamically
const getServerUrl = () => {
  // Check for environment variable first (for team testing with ngrok)
  if (import.meta.env.VITE_API_URL) {
    console.log('[Socket.io] Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname;
    
    // If accessing from ngrok or external, use same origin
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // For production/ngrok: backend should be on same domain or specified separately
      const url = `${protocol}//${hostname}:4000`;
      console.log('[Socket.io] External access, connecting to:', url);
      return url;
    }
    
    // Local development
    const url = `http://localhost:4000`;
    console.log('[Socket.io] Local dev, connecting to:', url);
    return url;
  }
  return 'http://localhost:4000';
};

const SERVER_URL = getServerUrl();

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  let retries = 0;

  useEffect(() => {
    const socketInstance = io(SERVER_URL, {
      transports: ['websocket'], // Force WebSocket for better performance
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to Game Server:', socketInstance.id);
      setIsConnected(true);
      setStatus('connected');
      retries = 0;
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from Game Server');
      setIsConnected(false);
      setStatus('disconnected');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('❌ Connection Error:', err);
      console.error('Trying to connect to:', SERVER_URL);
      setStatus('disconnected');
      const delay = Math.min(5000, 500 * (retries + 1));
      retries += 1;
      setTimeout(() => {
        setStatus('connecting');
        socketInstance.connect();
      }, delay);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected, status };
};