import axios from 'axios';

// Same-origin "/api" by default (Vite proxy in dev, Vercel rewrite in prod). Override with VITE_API_URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const res = err.response;
    const message =
      res?.data?.message ||
      (err.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Cannot reach the server. Check your connection.');
    if (res?.status === 401 && !String(err.config?.url || '').startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(Object.assign(new Error(message), { status: res?.status, code: res?.data?.code, details: res?.data?.details }));
  }
);

export default api;
