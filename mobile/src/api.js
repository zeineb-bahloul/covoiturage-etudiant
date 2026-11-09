import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://192.168.1.43:5000/api';

let cachedToken = null;

export const setApiToken = async (token) => {
  cachedToken = token;
  if (token) {
    await AsyncStorage.setItem('token', token);
  }
};

export const clearApiToken = async () => {
  cachedToken = null;
  await AsyncStorage.removeItem('token');
};

export const loadApiToken = async () => {
  if (!cachedToken) {
    cachedToken = await AsyncStorage.getItem('token');
  }
  return cachedToken;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 8000,
});

// Intercepteur synchrone — pas de await à chaque requête
api.interceptors.request.use((config) => {
  if (cachedToken) {
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

export default api;
