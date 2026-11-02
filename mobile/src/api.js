import axios from 'axios';

export const API_URL = 'http://192.168.1.43:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export default api;