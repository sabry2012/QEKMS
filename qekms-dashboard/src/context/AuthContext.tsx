import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

interface User {
  email: string;
  role: string;
  id: string;
  plan: string;
  full_name: string;
  phone_number?: string;
  channels_created_total?: number;
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
        const u = res.data.user;
        setUser({
          email: u.email || u.sub,
          role: u.role,
          id: u.id,
          plan: u.plan || 'free',
          full_name: u.full_name || 'User',
          phone_number: u.phone_number,
          channels_created_total: u.channels_created_total,
        });
        setSessionExp(res.data.exp);
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