import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { constantService } from '../services/constantService';
import { legalAgreementService } from '../services/legalAgreementService';
import { useNavigate, Link } from 'react-router-dom';
import type { City, Gender, LegalAgreement } from '../types';
import SearchableSelect from '../components/SearchableSelect';
import AgreementModal from '../components/AgreementModal';
import { useAuth } from '../context/AuthContext';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const SESSION_KEY = 'register_form';

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
  const [agreements, setAgreements] = useState<LegalAgreement[]>([]);

  // Sayfa yüklenince form verilerini sessionStorage'dan yükle
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch { /* Bozuk veri görmezden gel */ }
    }
  }, []);

  // Sayfa yüklenince Şehir, Cinsiyet ve Sözleşmeleri Çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        const cityRes = await constantService.getCities();
        const genderRes = await constantService.getGenders();
        const agreementRes = await legalAgreementService.getActive();

        if (cityRes.data.success) setCities(cityRes.data.data);
        if (genderRes.data.success) setGenders(genderRes.data.data);
        if (agreementRes.data.success) setAgreements(agreementRes.data.data);
      } catch (err) {
        console.error("Veri çekme hatası", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    let updated: typeof formData;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      updated = { ...formData, [name]: checked };
    } else {
      const val = (name === 'cityCode' || name === 'genderCode') ? Number(value) : value;
      updated = { ...formData, [name]: val };
    }
    setFormData(updated);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
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
        sessionStorage.removeItem(SESSION_KEY);
        
        // Yeni Eklenen Kod: Kayıt başarılı ve auth cookie'si alındı. Sözleşmeleri onayla.
        if (agreements.length > 0) {
          try {
            for (const agreement of agreements) {
              await legalAgreementService.accept(agreement.id);
            }
          } catch (err) {
            console.error("Sözleşme onayları kaydedilirken hata oluştu:", err);
            // Hata olsa da kayıt yapıldı, App.tsx tekrar zorunlu onay isteyecektir.
          }
        }

        await checkAuth();
        alert("Kayıt Başarılı! Hoşgeldiniz.");
        navigate('/verify-email', { state: { email: formData.email } });
      } else {
        setError("Kayıt işlemi başarısız oldu.");
      }
    } catch (err: any) {
      console.error("Kayıt hatası:", err);
      
      if (err.response && err.response.data) {
        const data = err.response.data;
        const contentType = err.response.headers?.['content-type'] || '';
        
        if (typeof data === 'string') {
          if (data.includes('<!DOCTYPE') || data.includes('<html') || contentType.includes('text/html')) {
            setError("Sunucuya şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
          } else {
            setError(data);
          }
        } else if (Array.isArray(data)) {
          // Validation errors from FluentValidation
          setError(data.map((e: any) => e.errorMessage || e.message).join(", "));
        } else {
          // Message (PascalCase) or message (lowercase)
          setError(data.Message || data.message || "Kayıt işlemi sırasında bir hata oluştu.");
        }
      } else if (err.request) {
        setError("Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.");
      } else {
        setError("Kayıt yapılırken bir teknik hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await userService.googleLogin(credentialResponse.credential);
      if (res.data.success) {
        await checkAuth();
        toast.success('Giriş başarılı!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.response?.data || "Google ile giriş yapılırken hata oluştu.");
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

        <div className="mt-8">
          <div className="w-full flex justify-center mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => { toast.error("Google penceresi kapandı veya hata oluştu."); }}
              useOneTap={false}
              theme="outline"
              shape="pill"
              text="continue_with"
            />
          </div>
          
          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">veya</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleRegister}>

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

          {/* --- SÖZLEŞME ONAYI --- */}
          <div className="flex items-start mt-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 transition-all hover:bg-indigo-50">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                required
                readOnly
                checked={isAccepted}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                disabled={loading}
              />
            </div>
            <div className="ml-3 text-[11px] leading-4 text-slate-700">
              <label className="select-none">
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

      {/* --- DİNAMİK SÖZLEŞME MODAL'I --- */}
      {isTermsModalOpen && agreements.length > 0 && (
        <AgreementModal
          agreements={agreements}
          skipApiCall={true}
          onAcceptAll={() => {
            setIsAccepted(true);
            setIsTermsModalOpen(false);
          }}
        />
      )}

      {/* Aktif sözleşme yoksa fallback: basit onay */ }
      {isTermsModalOpen && agreements.length === 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 text-center">
            <p className="text-slate-600 mb-6 text-sm">Sözleşmeler yükleniyor veya henüz tanımlanmamış.</p>
            <button
              onClick={() => { setIsAccepted(true); setIsTermsModalOpen(false); }}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
            >
              Kabul Ediyorum
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;