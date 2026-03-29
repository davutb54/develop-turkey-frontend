import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/userService';

// null = yükleniyor, false = giriş yok, number = kullanıcı id'si
interface AuthContextType {
  userId: number | null | false;
  setUserId: (id: number | false) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  setUserId: () => {},
  checkAuth: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<number | null | false>(null);

  const checkAuth = async () => {
    try {
      const response = await userService.getMe();
      if (response.data && response.data.success) {
        setUserId(response.data.data.id);
      } else {
        setUserId(false);
      }
    } catch {
      setUserId(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ userId, setUserId, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
