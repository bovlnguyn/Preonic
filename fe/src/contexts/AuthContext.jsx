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
    const stored = sessionStorage.getItem(USER);
    const token  = sessionStorage.getItem(ACCESS_TOKEN);
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (accessToken, userData) => {
    sessionStorage.setItem(ACCESS_TOKEN, accessToken);
    sessionStorage.setItem(USER, JSON.stringify(userData));
    setUser(userData);
  };

  // Cập nhật user trong context + session sau khi chỉnh sửa hồ sơ
  const updateUser = (userData) => {
    sessionStorage.setItem(USER, JSON.stringify(userData));
    setUser(userData);
  };

  // Cập nhật access token sau khi đổi mật khẩu (BE rotate token mới)
  const setAccessToken = (accessToken) => {
    sessionStorage.setItem(ACCESS_TOKEN, accessToken);
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}
    // ← Đảm bảo xóa localStorage dù API có lỗi
    sessionStorage.removeItem(ACCESS_TOKEN);
    sessionStorage.removeItem(USER);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, setAccessToken }}>
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