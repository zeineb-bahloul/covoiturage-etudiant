import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../api';
import { getSocket } from '../socket';

export const AuthContext = createContext({
  token: null,
  connecter: async () => {},
  deconnecter: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/* ─── Temps réel : compteurs (cloche, messages) + bandeau de notification ─── */

export const RealtimeContext = createContext({
  nbNotifs: 0,
  nbMessages: 0,
  rafraichirCompteurs: () => {},
  bandeau: null,
  fermerBandeau: () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ token, children }) {
  const [nbNotifs, setNbNotifs] = useState(0);
  const [nbMessages, setNbMessages] = useState(0);
  const [bandeau, setBandeau] = useState(null);
  const minuteur = useRef(null);

  const rafraichirCompteurs = useCallback(async () => {
    if (!token) return;
    try {
      const [n, m] = await Promise.all([api.get('/notifications/non-lues'), api.get('/conversations/non-lues')]);
      setNbNotifs(n.data.nb || 0);
      setNbMessages(m.data.nb || 0);
    } catch {
      /* hors ligne : on garde les anciens compteurs */
    }
  }, [token]);

  const fermerBandeau = useCallback(() => setBandeau(null), []);

  useEffect(() => {
    if (!token) return undefined;
    rafraichirCompteurs();
    const socket = getSocket();
    if (!socket) return undefined;

    const surNotification = (notif) => {
      setNbNotifs((n) => n + 1);
      // Les messages ont leur propre badge : pas de bandeau si le chat est ouvert (le serveur ne notifie pas)
      setBandeau(notif);
      clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => setBandeau(null), 4500);
    };
    const surConversation = () => rafraichirCompteurs();

    socket.on('notification:new', surNotification);
    socket.on('conversation:update', surConversation);
    socket.on('connect', rafraichirCompteurs);
    return () => {
      socket.off('notification:new', surNotification);
      socket.off('conversation:update', surConversation);
      socket.off('connect', rafraichirCompteurs);
      clearTimeout(minuteur.current);
    };
  }, [token, rafraichirCompteurs]);

  return (
    <RealtimeContext.Provider value={{ nbNotifs, nbMessages, rafraichirCompteurs, bandeau, fermerBandeau }}>
      {children}
    </RealtimeContext.Provider>
  );
}
