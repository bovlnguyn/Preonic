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

const { ACCESS_TOKEN, USER } = STORAGE_KEYS;

const AuthContext = createContext(null);

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
