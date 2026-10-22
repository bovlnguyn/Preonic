import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { STORAGE_KEYS } from '../constants';
import authService from '../services/auth.service.js';
import { clearStoredAuth, refreshAccessToken } from '../services/api';

const { ACCESS_TOKEN, USER } = STORAGE_KEYS;

const AuthContext = createContext(null);

const readTokenExpiry = (token) => {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = JSON.parse(window.atob(normalized));
    return Number(decoded.exp || 0) * 1000;
  } catch {
    return 0;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem(USER);
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN);

    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        sessionStorage.removeItem(USER);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let timer;
    let disposed = false;

    const refreshSession = async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          clearStoredAuth();
          disposed = true;
          setUser(null);
        }
        throw error;
      }
    };

    const scheduleRefresh = () => {
      if (disposed) return;
      const token = sessionStorage.getItem(ACCESS_TOKEN);
      const expiresAt = readTokenExpiry(token || '');
      const delay = expiresAt
        ? Math.max(5_000, expiresAt - Date.now() - 60_000)
        : 60_000;

      timer = window.setTimeout(async () => {
        try {
          await refreshSession();
        } catch {
          // The shared Axios interceptor will distinguish a real session expiry
          // from a temporary network/database interruption on the next request.
        } finally {
          scheduleRefresh();
        }
      }, Math.min(delay, 2_147_000_000));
    };

    const refreshOnFocus = () => {
      const token = sessionStorage.getItem(ACCESS_TOKEN);
      const expiresAt = readTokenExpiry(token || '');
      if (expiresAt && expiresAt - Date.now() <= 60_000) {
        void refreshSession().catch(() => {});
      }
    };

    scheduleRefresh();
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [user]);

  const login = useCallback((accessToken, userData) => {
    if (!accessToken || !userData) return;

    sessionStorage.setItem(ACCESS_TOKEN, accessToken);
    sessionStorage.setItem(USER, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const updateUser = useCallback((userData) => {
    if (!userData) return;

    sessionStorage.setItem(USER, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const setAccessToken = useCallback((accessToken) => {
    if (!accessToken) return;
    sessionStorage.setItem(ACCESS_TOKEN, accessToken);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ACCESS_TOKEN);
    sessionStorage.removeItem(USER);
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(USER);
    setUser(null);

    // Logout backend theo kiểu best-effort: UI không bị treo khi DB/mạng tạm lỗi.
    void authService.logout();
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, updateUser, setAccessToken }),
    [user, loading, login, logout, updateUser, setAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
