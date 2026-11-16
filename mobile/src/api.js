import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// En local : l'adresse IP de l'ordinateur qui fait tourner le backend (ipconfig sous Windows).
// Après déploiement (Render) : définir EXPO_PUBLIC_API_URL=https://uniride-api.onrender.com dans mobile/.env
export const SERVER_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.43:5000';
export const API_URL = `${SERVER_URL}/api`;

let cachedToken = null;
let surDeconnexion = null;

export const setApiToken = async (token) => {
  cachedToken = token;
  if (token) await AsyncStorage.setItem('token', token);
};

export const clearApiToken = async () => {
  cachedToken = null;
  await AsyncStorage.removeItem('token');
};

export const loadApiToken = async () => {
  if (!cachedToken) cachedToken = await AsyncStorage.getItem('token');
  return cachedToken;
};

export const getApiToken = () => cachedToken;

/** App.js enregistre ici la fonction appelée quand le jeton expire (réponse 401). */
export const surJetonExpire = (fn) => {
  surDeconnexion = fn;
};

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  if (cachedToken) config.headers.Authorization = `Bearer ${cachedToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const status = err.response?.status;
    if (cachedToken && !url.startsWith('/auth/login') && (status === 401 || (status === 403 && err.response?.data?.bloque))) {
      // Jeton expiré, compte supprimé ou bloqué par l'administration
      surDeconnexion?.(status === 403 ? err.response.data.message : null);
    }
    return Promise.reject(err);
  }
);

export default api;
