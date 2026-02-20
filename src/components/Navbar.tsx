import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import type { UserDetailDto } from '../types';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetailDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem('userId');
      
      if (userId) {
        try {
          // Giriş yapmış kullanıcının tüm detaylarını çekiyoruz
          const response = await userService.getById(parseInt(userId));
          if (response.data.success) {
            setUser(response.data.data);
          }
        } catch (error) {
          console.error("Kullanıcı bilgileri çekilemedi:", error);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    // Çıkış yaparken localstorage'ı temizle
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* SOL KISIM: Logo ve Ana Menü */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-black text-blue-600 tracking-tighter">DT</span>
              <span className="font-bold text-gray-800 hidden sm:block">DevelopTurkey</span>
            </Link>
          </div>

          {/* SAĞ KISIM: Kullanıcı İşlemleri */}
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user ? (
                  // KULLANICI GİRİŞ YAPMIŞSA
                  <div className="flex items-center gap-4">
                    
                    {/* YENİ EKLENEN SORUN PAYLAŞ BUTONU */}
                    <Link to="/add-problem" className="hidden sm:block text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition">
                      + Sorun Paylaş
                    </Link>

                    {/* ADMİN KONTROLÜ */}
                    {user.isAdmin && (
                      <Link to="/admin" className="text-sm font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 transition">
                        Admin Paneli
                      </Link>
                    )}

                    {/* PROFİL KISMI */}
                    <div className="flex items-center gap-3 border-l pl-4 ml-2">
                      <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
                        <div className="h-8 w-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex-shrink-0">
                          {user.profileImageUrl ? (
                            <img src={`https://localhost:7216/uploads/profiles/${user.profileImageUrl}`} alt="Profil" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-100">
                              {user.name[0]}{user.surname[0]}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-700 hidden md:block">
                          {user.userName}
                        </span>
                      </Link>
                      
                      <button 
                        onClick={handleLogout}
                        className="text-sm font-medium text-gray-500 hover:text-red-600 transition ml-2"
                        title="Çıkış Yap"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  // GİRİŞ YAPMAMIŞSA
                  <div className="flex items-center gap-3">
                    <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition">
                      Giriş Yap
                    </Link>
                    <Link to="/register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition shadow-sm">
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