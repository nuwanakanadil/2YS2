// 'use client'
import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:5000', {
      path: '/socket.io',          // keep in sync with server
      autoConnect: false,          // 👈 prevent auto-connect
      withCredentials: true,
      transports: ['websocket'],   // avoid long-polling noise
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  const s = getSocket();
  if (s && s.connected) s.disconnect();
}
