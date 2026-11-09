import React, { createContext, useContext } from 'react';

export const AuthContext = createContext({
  token: null,
  connecter: async () => {},
  deconnecter: async () => {},
});

export const useAuth = () => useContext(AuthContext);
