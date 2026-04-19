import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

interface User {
  email: string;
  role: string;
  id: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sessionExp: number | null; // Unix timestamp
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExp, setSessionExp] = useState<number | null>(null);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser({
          email: res.data.user.sub,
          role: res.data.user.role,
          id: res.data.user.id,
        });
        setSessionExp(res.data.user.exp);
      } else {
        setUser(null);
        setSessionExp(null);
      }
    } catch {
      setUser(null);
      setSessionExp(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchUser();
      setLoading(false);
    };
    init();
  }, []);

  const login = async () => {
    await fetchUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { }
    setUser(null);
    setSessionExp(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sessionExp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);