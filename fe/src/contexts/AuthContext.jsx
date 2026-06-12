import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import authService from '../services/auth.service.js';

const { ACCESS_TOKEN, USER } = STORAGE_KEYS;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục session khi reload trang
  useEffect(() => {
    const stored = localStorage.getItem(USER);
    const token  = localStorage.getItem(ACCESS_TOKEN);
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (accessToken, userData) => {
    localStorage.setItem(ACCESS_TOKEN, accessToken);
    localStorage.setItem(USER, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}
    // ← Đảm bảo xóa localStorage dù API có lỗi
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(USER);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;