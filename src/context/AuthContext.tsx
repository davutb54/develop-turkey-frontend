import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { legalAgreementService } from '../services/legalAgreementService';

// null = yükleniyor, false = giriş yok, number = kullanıcı id'si
interface AuthContextType {
  userId: number | null | false;
  isAdmin: boolean;
  isMaintenance: boolean;
  isProfileIncomplete: boolean;
  hasPendingAgreement: boolean;
  setUserId: (id: number | false) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsMaintenance: (isMain: boolean) => void;
  setHasPendingAgreement: (val: boolean) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  isAdmin: false,
  isMaintenance: false,
  isProfileIncomplete: false,
  hasPendingAgreement: false,
  setUserId: () => { },
  setIsAdmin: () => { },
  setIsMaintenance: () => { },
  setHasPendingAgreement: () => { },
  checkAuth: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<number | null | false>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState<boolean>(false);
  const [hasPendingAgreement, setHasPendingAgreement] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      const response = await userService.getMe();
      if (response.data && response.data.success) {
        const user = response.data.data;

        // Oturum açıkken e-posta doğrulanmamışsa kullanıcıyı sistemden at ve doğrulama sayfasına yönlendir
        if (user?.isEmailVerified === false) {
          try {
            // VerifyEmail sayfasında otomatik tekrar gönderme için
            sessionStorage.setItem('pending_verify_email', user.email || '');
          } catch {
            // sessionStorage erişimi engellenmiş olabilir
          }

          setUserId(false);
          setIsAdmin(false);
          setIsProfileIncomplete(false);
          setHasPendingAgreement(false);

          const currentPath = window.location.pathname.toLowerCase();
          if (!currentPath.includes('/verify-email')) {
            window.location.href = '/verify-email';
          }
          return;
        }

        setUserId(user.id);
        setIsAdmin(user.isAdmin);
        setIsMaintenance(false); // Başarılıysa bakımda değilizdir (veya adminiz)

        // Eğer profil verisi eksikse bunu state'e yazıyoruz
        if (user.cityCode === 0 || user.genderCode === -1) {
          setIsProfileIncomplete(true);
        } else {
          setIsProfileIncomplete(false);
        }

        // Kullanıcı giriş yapmışsa major sözleşme onayı kontrolü
        try {
          const pendingRes = await legalAgreementService.hasPending();
          if (pendingRes.data.success) {
            setHasPendingAgreement(pendingRes.data.data === true);
          }
        } catch {
          // hasPending hatası auth akışını kesmemeli
          setHasPendingAgreement(false);
        }
      } else {
        setUserId(false);
        setIsAdmin(false);
        setIsProfileIncomplete(false);
        setHasPendingAgreement(false);
      }
    } catch (err: any) {
      if (err.response && err.response.status === 503) {
        setIsMaintenance(true);
      }
      setUserId(false);
      setIsAdmin(false);
      setHasPendingAgreement(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ userId, isAdmin, isMaintenance, isProfileIncomplete, hasPendingAgreement, setUserId, setIsAdmin, setIsMaintenance, setHasPendingAgreement, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

