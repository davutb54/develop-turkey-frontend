import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/userService';
import { institutionService } from '../services/institutionService';
import { feedbackService } from '../services/feedbackService';
import type { UserDetailDto, Institution } from '../types';

const Navbar = () => {
  const [user, setUser] = useState<UserDetailDto | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  // --- MOBİL MENÜ STATE'İ ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- GERİ BİLDİRİM (FEEDBACK) STATE'LERİ ---
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    const fetchUserAndTheme = async () => {
      const userId = localStorage.getItem('userId');

      try {
        if (userId) {
          const response = await userService.getById(parseInt(userId));
          if (response.data.success) {
            const userData = response.data.data;
            setUser(userData);

            if (userData.institutionId) {
              const instRes = await institutionService.getById(userData.institutionId);
              if (instRes.data.success) {
                setInstitution(instRes.data.data);
                document.documentElement.style.setProperty('--theme-color', instRes.data.data.primaryColor || '#ffffff');
              }
            }
          }
        } else {
          const instRes = await institutionService.getById(1);
          if (instRes.data.success) {
            setInstitution(instRes.data.data);
            document.documentElement.style.setProperty('--theme-color', instRes.data.data.primaryColor || '#ffffff');
          }
        }
      } catch (error: any) {
        console.error("Bilgiler çekilemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTheme();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
    document.documentElement.style.removeProperty('--theme-color');
    window.location.href = '/login'; 
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    if (!userId) { 
        alert("Öneri göndermek için giriş yapmalısınız."); 
        return; 
    }
    
    setFeedbackLoading(true);
    try {
        await feedbackService.add({
            userId: parseInt(userId),
            title: feedbackTitle,
            message: feedbackMessage
        });
        alert("Mesajınız yönetime başarıyla iletildi! Teşekkür ederiz.");
        setIsFeedbackOpen(false);
        setFeedbackTitle('');
        setFeedbackMessage('');
    } catch {
        alert("Gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
    } finally {
        setFeedbackLoading(false);
    }
  };

  const navBgColor = !loading && institution?.primaryColor ? institution.primaryColor : '#ffffff';
  const isCustomTheme = !loading && institution?.primaryColor && institution.primaryColor.toLowerCase() !== '#ffffff';
  const textColor = isCustomTheme ? 'text-white' : 'text-gray-800';

  return (
    <>
      <nav style={{ backgroundColor: navBgColor, transition: 'background-color 0.3s ease-in' }} className={`shadow-md border-b ${isCustomTheme ? 'border-transparent' : 'border-gray-100'} relative z-[40]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">

            {/* SOL KISIM: Logo */}
            <div className="flex items-center">
              <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                {!loading && (
                  <Link to="/" className="flex items-center gap-3 group">
                    {institution?.logoUrl ? (
                      <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-sm overflow-hidden group-hover:scale-105 transition">
                        <img src={institution.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center p-1.5 shadow-sm overflow-hidden group-hover:scale-105 transition ${isCustomTheme ? 'bg-white/20' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        <span className={`text-xl font-black text-white`}>DT</span>
                      </div>
                    )}
                    
                    <div className="flex flex-col">
                      <span className={`font-bold ${textColor}`}>
                        {institution?.name || 'Develop Turkey'}
                      </span>
                      {institution && institution.id !== 1 && (
                        <span className={`text-[9px] font-black uppercase tracking-widest opacity-80 ${textColor}`}>
                          Özel Kurum Ağı
                        </span>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* SAĞ KISIM: Masaüstü İşlemleri ve Mobil Menü Butonu */}
            <div className="flex items-center gap-4">
              <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                {!loading && (
                  <>
                    {user ? (
                      <>
                        {/* --- MASAÜSTÜ MENÜ (Sadece lg ekranlarda görünür) --- */}
                        <div className="hidden lg:flex items-center gap-4">
                            <button 
                                onClick={() => setIsFeedbackOpen(true)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition shadow-sm active:scale-95 ${isCustomTheme ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' : 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                İstek / Öneri
                            </button>

                            <Link to="/add-problem" className={`text-sm font-bold px-3 py-1.5 rounded-md transition shadow-sm ${isCustomTheme ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20' : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'}`}>
                                + Sorun Paylaş
                            </Link>

                            {user.isAdmin && (
                                <Link to="/admin" className={`text-sm font-bold px-3 py-1.5 rounded-md transition shadow-sm ${isCustomTheme ? 'bg-red-500/80 text-white hover:bg-red-500 border border-red-400/50' : 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'}`}>
                                    Admin Paneli
                                </Link>
                            )}

                            <div className={`flex items-center gap-3 border-l pl-4 ml-2 h-8 ${isCustomTheme ? 'border-white/30' : 'border-gray-200'}`}>
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
                                    <span className={`text-sm font-bold ${textColor}`}>
                                        {user.userName}
                                    </span>
                                </Link>

                                <button onClick={handleLogout} className={`text-sm font-medium transition ml-2 ${isCustomTheme ? 'text-white/80 hover:text-red-300' : 'text-gray-500 hover:text-red-600'}`} title="Çıkış Yap">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* --- MOBİL HAMBURGER BUTONU (Sadece lg altı ekranlarda) --- */}
                        <div className="lg:hidden flex items-center">
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                                className={`p-2 rounded-md transition ${isCustomTheme ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isMobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Link to="/login" className={`text-sm font-bold transition hidden sm:block ${isCustomTheme ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-blue-600'}`}>
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
        </div>

        {/* --- MOBİL AÇILIR MENÜ (DROPDOWN) --- */}
        {user && isMobileMenuOpen && (
            <div className="lg:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100 py-2 animate-fade-in-down z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex-shrink-0">
                        {user.profileImageUrl ? (
                            <img src={`/uploads/profiles/${user.profileImageUrl}`} alt="Profil" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-sm font-bold text-gray-500 bg-gray-100">
                                {user.name[0]}{user.surname[0]}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900">@{user.userName}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                </div>
                
                <div className="flex flex-col py-2">
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Profilim
                    </Link>
                    <Link to="/add-problem" onClick={() => setIsMobileMenuOpen(false)} className="px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Sorun Paylaş
                    </Link>
                    <button 
                        onClick={() => { setIsFeedbackOpen(true); setIsMobileMenuOpen(false); }} 
                        className="w-full text-left px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-amber-600 flex items-center gap-3"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        Yönetime İstek / Öneri
                    </button>
                    
                    {user.isAdmin && (
                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-red-600 flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Admin Paneli
                        </Link>
                    )}
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Çıkış Yap
                    </button>
                </div>
            </div>
        )}
      </nav>

      {/* --- GERİ BİLDİRİM (İSTEK / ÖNERİ) MODAL'I --- */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-scale-up border border-slate-100">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Yönetime Mesaj Gönder</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">İstek, Öneri veya Hata Bildirimi</p>
                        </div>
                    </div>
                    <button onClick={() => setIsFeedbackOpen(false)} className="text-slate-400 hover:text-rose-500 transition bg-white p-2 rounded-full shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSendFeedback} className="p-6 space-y-5 bg-white">
                    <p className="text-xs text-slate-600 leading-relaxed border-l-2 border-amber-400 pl-3 bg-amber-50/50 py-2 pr-2 rounded-r-lg">
                        Platformun gelişmesi için fikirleriniz bizim için çok değerli. Lütfen karşılaştığınız bir hatayı veya eklenmesini istediğiniz bir özelliği detaylıca yazın.
                    </p>
                    
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Konu Başlığı</label>
                        <input 
                            type="text" 
                            required 
                            value={feedbackTitle} 
                            onChange={e => setFeedbackTitle(e.target.value)} 
                            className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-slate-50 transition" 
                            placeholder="Örn: Karanlık Mod Eklensin" 
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Mesajınız</label>
                        <textarea 
                            required 
                            value={feedbackMessage} 
                            onChange={e => setFeedbackMessage(e.target.value)} 
                            rows={4} 
                            className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-slate-50 transition resize-none custom-scrollbar" 
                            placeholder="Detayları buraya yazabilirsiniz..."
                        ></textarea>
                    </div>
                    
                    <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={() => setIsFeedbackOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition shadow-sm">
                            İptal
                        </button>
                        <button type="submit" disabled={feedbackLoading || !feedbackTitle.trim() || !feedbackMessage.trim()} className="px-8 py-2.5 bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-500/30 hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2">
                            {feedbackLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Gönderiliyor
                                </>
                            ) : 'Gönder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </>
  );
};

export default Navbar;