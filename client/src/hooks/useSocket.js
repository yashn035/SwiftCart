import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

/**
 * useSocket — manages a Socket.io connection for the buyer's personal room.
 * Automatically joins `buyer_<userId>` on mount and tears down on unmount.
 *
 * In development the Vite proxy forwards /socket.io → localhost:5000, so we
 * connect to '/' (same origin).  In production VITE_API_URL is set to the
 * full backend URL (e.g. https://swiftcart-backend.onrender.com) so we connect
 * directly to the remote server with transports: ['polling', 'websocket'].
 *
 * @param {Function} onOrderStatusUpdated - callback({ orderId, status, updatedAt })
 */
const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

const useSocket = (onOrderStatusUpdated) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'buyer') return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      socket.emit('joinBuyerRoom', user.id);
    });

    socket.on('orderStatusUpdated', (data) => {
      console.log('📦 Order status update received:', data);
      if (onOrderStatusUpdated) onOrderStatusUpdated(data);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  return socketRef;
};

export default useSocket;
