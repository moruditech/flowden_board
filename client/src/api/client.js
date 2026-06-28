import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const client = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
});

// ── Access token (in-memory only — never localStorage) ──────────────────────
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = ()       => _accessToken;

// ── Request interceptor: inject token ────────────────────────────────────────
client.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

// ── Response interceptor: silent refresh on 401 ──────────────────────────────
let _refreshing    = false;
let _refreshQueue  = [];

function processQueue(error, token = null) {
  _refreshQueue.forEach((p) => error ? p.reject(error) : p.resolve(token));
  _refreshQueue = [];
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);
    if (original.url?.includes('/auth/')) return Promise.reject(error);

    if (_refreshing) {
      return new Promise((resolve, reject) => {
        _refreshQueue.push({
          resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(client(original)); },
          reject,
        });
      });
    }

    original._retry = true;
    _refreshing     = true;

    try {
      const { data } = await client.post('/auth/refresh');
      const newToken  = data.data.accessToken;
      setAccessToken(newToken);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return client(original);
    } catch (err) {
      setAccessToken(null);
      processQueue(err);
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(err);
    } finally {
      _refreshing = false;
    }
  }
);
