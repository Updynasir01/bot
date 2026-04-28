import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(res => { setAdmin(res.data.admin); })
        .catch(() => {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('admin');
          setAdmin(null);
        })
        .finally(() => setLoading(false));
    } else {
      sessionStorage.removeItem('admin');
      setAdmin(null);
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    sessionStorage.setItem('token', res.data.token);
    sessionStorage.setItem('admin', JSON.stringify(res.data.admin));
    setAdmin(res.data.admin);
    return res.data;
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('admin');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
