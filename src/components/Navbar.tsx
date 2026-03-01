import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { institutionService } from '../services/institutionService';
import type { UserDetailDto, Institution } from '../types';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetailDto | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null); // YENİ
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndTheme = async () => {
      const userId = localStorage.getItem('userId');

      if (userId) {
        try {
          const response = await userService.getById(parseInt(userId));
          if (response.data.success) {
            const userData = response.data.data;
            setUser(userData);

            // KULLANICI GİRİŞ YAPTIĞINDA KURUMUNU KONTROL ET
            // Eğer 1 (Genel Ağ) değilse özel kuruma (üniversiteye) aittir.
            if (userData.institutionId && userData.institutionId !== 1) {
              const instRes = await institutionService.getById(userData.institutionId);
              if (instRes.data.success) {
                setInstitution(instRes.data.data);
                
                // Tema rengini CSS değişkeni olarak sayfaya bas! (Tüm sitede kullanılabilir)
                document.documentElement.style.setProperty('--theme-color', instRes.data.data.primaryColor || '#2563eb');
              }
            }
          }
        } catch (error: any) {
          console.error("Kullanıcı bilgileri çekilemedi:", error);
          if (error.response && error.response.status === 429) {
            setUser({
              id: parseInt(userId), userName: "Yeniden Bağlanıyor...", name: "", surname: "", email: "",
              profileImageUrl: null, isAdmin: false, isExpert: false, isOfficial: false, cityCode: 0, gender: 0,
              registerDate: new Date().toISOString()
            } as any);
          }
        }
      }
      setLoading(false);
    };

    fetchUserAndTheme();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
    setInstitution(null);
    // Çıkış yapınca temayı eski haline (varsayılan) getir
    document.documentElement.style.removeProperty('--theme-color');
    navigate('/login');
  };

  // Kurumun özel rengi varsa o, yoksa varsayılan beyaz renk olsun
  const navBgColor = institution?.primaryColor ? institution.primaryColor : '#ffffff';
  // Eğer arkaplan renkliyse (kurum varsa) yazılar beyaz olsun, kurum yoksa (beyazsa) yazılar siyah olsun
  const isCustomTheme = !!institution?.primaryColor;
  const textColor = isCustomTheme ? 'text-white' : 'text-gray-800';

  return (
    // Style inline olarak veriliyor, böylece veritabanından gelen hex kodu çalışıyor
    <nav style={{ backgroundColor: navBgColor, transition: 'background-color 0.5s ease' }} className={`shadow-md border-b ${isCustomTheme ? 'border-transparent' : 'border-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* SOL KISIM: Logo ve Ana Menü */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              {/* Kurum Logosu varsa göster, yoksa varsayılan DT logosunu göster */}
              {institution?.logoUrl ? (
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm overflow-hidden group-hover:scale-105 transition">
                  <img src={institution.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                </div>
              ) : (
                <span className={`text-2xl font-black tracking-tighter ${isCustomTheme ? 'text-white' : 'text-blue-600'}`}>DT</span>
              )}
              
              <div className="flex flex-col">
                <span className={`font-bold hidden sm:block ${textColor}`}>
                  {institution?.name || 'DevelopTurkey'}
                </span>
                {institution && (
                  <span className={`text-[9px] font-black uppercase tracking-widest opacity-80 ${textColor}`}>
                    Özel Kurum Ağı
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* SAĞ KISIM: Kullanıcı İşlemleri */}
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">

                    <Link to="/add-problem" className={`hidden sm:block text-sm font-bold px-3 py-1.5 rounded-md transition ${isCustomTheme ? 'bg-white/20 text-white hover:bg-white/30' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}>
                      + Sorun Paylaş
                    </Link>

                    {user.isAdmin && (
                      <Link to="/admin" className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 transition">
                        Admin Paneli
                      </Link>
                    )}

                    <div className={`flex items-center gap-3 border-l pl-4 ml-2 ${isCustomTheme ? 'border-white/30' : 'border-gray-200'}`}>
                      <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
                        <div className="h-8 w-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex-shrink-0 shadow-sm">
                          {user.profileImageUrl ? (
                            <img src={`/uploads/profiles/${user.profileImageUrl}`} alt="Profil" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-100">
                              {user.name[0]}{user.surname[0]}
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-bold hidden md:block ${textColor}`}>
                          {user.userName}
                        </span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className={`text-sm font-medium transition ml-2 ${isCustomTheme ? 'text-white/80 hover:text-red-300' : 'text-gray-500 hover:text-red-600'}`}
                        title="Çıkış Yap"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link to="/login" className={`text-sm font-bold transition ${isCustomTheme ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-blue-600'}`}>
                      Giriş Yap
                    </Link>
                    <Link to="/register" className={`text-sm font-bold px-4 py-2 rounded-md transition shadow-sm ${isCustomTheme ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      Kayıt Ol
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;