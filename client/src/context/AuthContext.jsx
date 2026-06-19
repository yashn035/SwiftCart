import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('swiftcart_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('swiftcart_token');
    if (token) {
      authApi
        .getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('swiftcart_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('swiftcart_token');
          localStorage.removeItem('swiftcart_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('swiftcart_token', token);
    localStorage.setItem('swiftcart_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, role) => {
    const res = await authApi.register({ name, email, password, role });
    const { token, user: userData } = res.data;
    localStorage.setItem('swiftcart_token', token);
    localStorage.setItem('swiftcart_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('swiftcart_token');
    localStorage.removeItem('swiftcart_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
