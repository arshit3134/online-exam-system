import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    authApi
      .me()
      .then((r) => alive && setUser(r.data.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    const expired = () => setUser(null);
    window.addEventListener('auth:expired', expired);
    return () => {
      alive = false;
      window.removeEventListener('auth:expired', expired);
    };
  }, []);

  const login = useCallback(async (body) => {
    const r = await authApi.login(body);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const register = useCallback(async (body) => {
    const r = await authApi.register(body);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export const homeFor = (role) => (role === 'teacher' ? '/teacher' : '/candidate');
