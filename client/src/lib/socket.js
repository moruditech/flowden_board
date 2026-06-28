import { io } from 'socket.io-client';
import { getAccessToken } from '../api/client.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect:          false,
      auth:                 (cb) => cb({ token: getAccessToken() }),
      reconnection:         true,
      reconnectionAttempts: 10,
      reconnectionDelay:    1000,
      reconnectionDelayMax: 5000,
      transports:           ['websocket', 'polling'],
    });
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error:', err.message);
    });
  }
  return socket;
}

export const connectSocket    = () => getSocket().connect();
export const disconnectSocket = () => socket?.disconnect();

export function reauthSocket() {
  const s = getSocket();
  if (s.connected) s.disconnect().connect();
}

window.addEventListener('auth:expired', () => socket?.disconnect());
