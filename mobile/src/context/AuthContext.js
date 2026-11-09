import React, { createContext, useContext } from 'react';

export const AuthContext = createContext({
  token: null,
  connecter: () => {},
  deconnecter: () => {},
});

export const useAuth = () => useContext(AuthContext);

