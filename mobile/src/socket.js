import { io } from 'socket.io-client';
import { SERVER_URL } from './api';

let socket = null;

/** Connexion Socket.io authentifiée (chat temps réel + notifications instantanées). */
export function connecterSocket(token) {
  if (socket) socket.disconnect();
  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1500,
  });
  return socket;
}

export function deconnecterSocket() {
  if (socket) socket.disconnect();
  socket = null;
}

export const getSocket = () => socket;
