import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { constantService } from '../services/constantService';
import { useNavigate, Link } from 'react-router-dom';
import type { City, Gender } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { Turnstile } from '@marsidev/react-turnstile';

const Register = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  // Form Verileri
  const [formData, setFormData] = useState({
    userName: '',
    name: '',
    surname: '',
    email: '',
    password: '',
    cityCode: 0,
    genderCode: -1,
    emailNotificationPermission: true
  });

  // Dropdown Verileri
  const [cities, setCities] = useState<City[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // --- SÖZLEŞME STATE'LERİ ---
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  // Sayfa yüklenince Şehir ve Cinsiyetleri Çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cityRes = await constantService.getCities();
        const genderRes = await constantService.getGenders();

        if (cityRes.data.success) setCities(cityRes.data.data);
        if (genderRes.data.success) setGenders(genderRes.data.data);
      } catch (err) {
        console.error("Veri çekme hatası", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      const val = (name === 'cityCode' || name === 'genderCode') ? Number(value) : value;
      setFormData(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAccepted) {
        setError("Devam etmek için sözleşmeyi onaylamalısınız.");
        return;
    }

    if (formData.cityCode === -1 || formData.cityCode === 0) {
      setError("Lütfen bir şehir seçiniz.");
      return;
    }
    if (formData.genderCode === -1) {
      setError("Lütfen cinsiyet seçiniz.");
      return;
    }

    setLoading(true);

    try {
      const response = await userService.register({ ...formData, captchaToken: captchaToken || undefined });

      if (response.data && (response.data as any).success) {
        await checkAuth();
        alert("Kayıt Başarılı! Hoşgeldiniz.");
        navigate('/verify-email', { state: { email: formData.email } });
      } else {
        setError("Kayıt işlemi başarısız oldu.");
      }
    } catch (err: any) {
      let errorMessage = "Sunucu hatası.";
      if (err.response && err.response.data) {
        if (Array.isArray(err.response.data)) {
          errorMessage = err.response.data.map((e: any) => e.errorMessage).join(", ");
        } else {
          errorMessage = typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data.message || "Bir hata oluştu";
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            Kayıt Ol
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 italic font-medium">Türkiye'yi Geliştirme Platformu</p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleRegister}>

          <div className="grid grid-cols-2 gap-4">
            <input name="name" type="text" required placeholder="Ad"
              className="input-field" onChange={handleChange} disabled={loading} />
            <input name="surname" type="text" required placeholder="Soyad"
              className="input-field" onChange={handleChange} disabled={loading} />
          </div>

          <input name="userName" type="text" required placeholder="Kullanıcı Adı"
            className="input-field w-full" onChange={handleChange} disabled={loading} />

          <input name="email" type="email" required placeholder="E-posta"
            className="input-field w-full" onChange={handleChange} disabled={loading} />

          <input name="password" type="password" required placeholder="Şifre"
            className="input-field w-full" onChange={handleChange} disabled={loading} />

          <div className="grid grid-cols-2 gap-4">
            <SearchableSelect
              options={cities.filter(c => c.value !== 0).map(c => ({ value: c.value, label: c.text }))}
              value={formData.cityCode}
              onChange={(val) => setFormData(prev => ({ ...prev, cityCode: Number(val) }))}
              placeholder="Şehir Seçiniz"
              disabled={loading}
            />

            <select name="genderCode" className="input-field bg-white" onChange={handleChange} value={formData.genderCode} disabled={loading}>
              <option value={-1}>Cinsiyet</option>
              {genders.map(gender => (
                <option key={gender.value} value={gender.value}>{gender.text}</option>
              ))}
            </select>
          </div>

          {/* BİLDİRİM İZNİ */}
          <div className="flex items-center">
            <input id="email-notif" name="emailNotificationPermission" type="checkbox"
              checked={formData.emailNotificationPermission} onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer" disabled={loading} />
            <label htmlFor="email-notif" className="ml-2 block text-xs text-gray-600 cursor-pointer select-none">
              E-posta bildirimlerini almak istiyorum
            </label>
          </div>

          {/* --- YENİLENMİŞ SÖZLEŞME ONAYI --- */}
          <div className="flex items-start mt-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 transition-all hover:bg-indigo-50">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                required
                checked={isAccepted}
                onChange={(e) => setIsAccepted(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                disabled={loading}
              />
            </div>
            <div className="ml-3 text-[11px] leading-4 text-slate-700">
              <label htmlFor="terms" className="cursor-pointer select-none">
                <button 
                  type="button" 
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-indigo-600 font-black hover:underline mr-1 focus:outline-none"
                >
                  Kullanım Koşullarını ve Gizlilik Politikasını
                </button> 
                okudum, kabul ediyorum. Yasal mevzuat gereği verilerimin kayıt altına alınmasını onaylıyorum.
              </label>
            </div>
          </div>

          {error && <div className="text-red-500 text-xs text-center font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">{error}</div>}

          {/* Cloudflare Turnstile Bot Koruması */}
          <div className="flex justify-center">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isAccepted || !captchaToken}
            className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-black rounded-xl text-white shadow-lg transition-all active:scale-95 
                ${(loading || !isAccepted || !captchaToken) ? 'bg-slate-300 cursor-not-allowed opacity-70' : 'bg-green-600 hover:bg-green-700 shadow-green-100'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Kayıt Oluşturuluyor...
              </>
            ) : (
              'Kayıt Ol'
            )}
          </button>

          <div className="text-center mt-4">
            <Link to="/login" className={`text-sm text-blue-600 font-medium hover:underline ${loading ? 'pointer-events-none opacity-50' : ''}`}>
              Zaten hesabın var mı? Giriş Yap
            </Link>
          </div>
        </form>
      </div>

      {/* --- YENİLENMİŞ SÖZLEŞME MODAL'I --- */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-scale-up overflow-hidden border border-white">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex flex-col">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Gizlilik Politikası</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Türkiye'yi Geliştirme Platformu</p>
                </div>
                <button onClick={() => setIsTermsModalOpen(false)} className="bg-white p-2 rounded-full shadow-sm text-slate-400 hover:text-rose-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Modal Content - SENİN METİNLERİN */}
            <div className="p-8 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-6 custom-scrollbar">
                
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-6 w-1 bg-indigo-600 rounded-full"></span>
                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">1. İÇERİK PAYLAŞIMI VE SORUMLULUK</h4>
                    </div>
                    <p className="pl-3 border-l border-slate-100">
                        Sitemiz üzerinde paylaşılan mesajlar ve yüklenen fotoğrafların tüm hukuki ve cezai sorumluluğu, <strong>içeriği oluşturan kullanıcıya aittir.</strong> Yer sağlayıcı olarak, paylaşılan içerikleri kontrol etme yükümlülüğümüz bulunmamakla birlikte, hukuka aykırı içeriklerin bildirilmesi durumunda <strong>"Uyar-Kaldır"</strong> prensibi işletilecektir. Amacımız, tüm kullanıcılar için güvenli ve saygılı bir paylaşım ortamı sunmaktır.
                    </p>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-6 w-1 bg-indigo-600 rounded-full"></span>
                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">2. YASAL BİLGİLENDİRME (5651 Sayılı Kanun)</h4>
                    </div>
                    <p className="pl-3 border-l border-slate-100">
                        Yasal yükümlülüklerimizi yerine getirmek amacıyla; sitemizdeki trafik verileri (<strong>IP adresi, port bilgisi ve zaman damgası</strong>) 5651 Sayılı Kanun gereğince kayıt altına alınmakta ve yasal süreler boyunca saklanmaktadır. Bu bilgiler, sadece resmi makamların usulüne uygun talepleri doğrultusunda paylaşılabilir. Sitemiz henüz ticari bir faaliyet gütmemekte olup, bireysel bir proje olarak işletilmektedir. Platform sahibi, hizmetin içeriğini değiştirme veya tamamen durdurma hakkını saklı tutar.
                    </p>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-6 w-1 bg-indigo-600 rounded-full"></span>
                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">3. DESTEK VE İLETİŞİM</h4>
                    </div>
                    <p className="pl-3 border-l border-slate-100 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                        Sizi rahatsız eden, uygunsuz olduğunu düşündüğünüz veya platformun kalitesine zarar veren bir paylaşımla karşılaşırsanız lütfen bize haber verin. Her türlü görüş, destek ve bildirim talebiniz için <a href="mailto:turkiyeyigelistirmeplatformu26@gmail.com" className="text-indigo-600 font-bold underline">turkiyeyigelistirmeplatformu26@gmail.com</a> adresi üzerinden bizimle doğrudan iletişime geçebilirsiniz. Bildiriminiz en kısa sürede titizlikle incelenecek ve gerekli aksiyonlar alınacaktır.
                    </p>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-6 w-1 bg-indigo-600 rounded-full"></span>
                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">4. GİZLİLİK VE VERİ GÜVENLİĞİ</h4>
                    </div>
                    <p className="pl-3 border-l border-slate-100">
                        Kullanıcılarımızın gizliliği bizim için önemlidir. Paylaştığınız profil bilgileri ve e-posta adresleri, platformun temel işlevlerini yerine getirmek dışında üçüncü taraflarla paylaşılmaz. Sitemiz, kullanım kolaylığı sağlamak adına standart çerezler kullanabilir.
                    </p>
                </section>

            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t bg-slate-50 flex justify-center">
                <button 
                  onClick={() => { setIsAccepted(true); setIsTermsModalOpen(false); }}
                  className="w-full sm:w-auto px-12 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-[2px] rounded-2xl hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 active:scale-95"
                >
                  Okudum ve Kabul Ediyorum
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;