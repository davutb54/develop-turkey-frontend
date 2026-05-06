import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/userService';

// null = yükleniyor, false = giriş yok, number = kullanıcı id'si
interface AuthContextType {
  userId: number | null | false;
  isAdmin: boolean;
  isMaintenance: boolean;
  isProfileIncomplete: boolean;
  setUserId: (id: number | false) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsMaintenance: (isMain: boolean) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  isAdmin: false,
  isMaintenance: false,
  isProfileIncomplete: false,
  setUserId: () => { },
  setIsAdmin: () => { },
  setIsMaintenance: () => { },
  checkAuth: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<number | null | false>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      const response = await userService.getMe();
      if (response.data && response.data.success) {
        const user = response.data.data;
        setUserId(user.id);
        setIsAdmin(user.isAdmin);
        setIsMaintenance(false); // Başarılıysa bakımda değilizdir (veya adminiz)

        // Eğer profil verisi eksikse bunu state'e yazıyoruz
        if (user.cityCode === 0 || user.genderCode === -1) {
          setIsProfileIncomplete(true);
        } else {
          setIsProfileIncomplete(false);
        }
      } else {
        setUserId(false);
        setIsAdmin(false);
        setIsProfileIncomplete(false);
      }
    } catch (err: any) {
      if (err.response && err.response.status === 503) {
        setIsMaintenance(true);
      }
      setUserId(false);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ userId, isAdmin, isMaintenance, isProfileIncomplete, setUserId, setIsAdmin, setIsMaintenance, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
