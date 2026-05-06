// src/pages/Login.tsx
import { useState } from 'react';
import { userService } from '../services/userService';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Turnstile } from '@marsidev/react-turnstile';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

const Login = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await userService.login({ userName, password, captchaToken: captchaToken || undefined });

      // Backend artık HttpOnly cookie dönüyor ve response.data.success = true gönderiyor
      if (response.data && (response.data as any).success) {
        await checkAuth();
        navigate('/');
      } else {
        // Hata
        setError("Giriş başarısız.");
      }
    } catch (err: any) {
      // Backend'den gelen hata mesajını daha detaylı yakalıyoruz
      console.error("Login hatası:", err);
      
      if (err.response && err.response.data) {
        const data = err.response.data;
        const contentType = err.response.headers?.['content-type'] || '';
        
        if (typeof data === 'string') {
          // HTML içeriği gelirse (502, 504 vb.) temiz mesaj göster
          if (data.includes('<!DOCTYPE') || data.includes('<html') || contentType.includes('text/html')) {
            setError("Sunucu şu anda yoğun veya ulaşılamıyor. Lütfen birazdan tekrar deneyin.");
          } else {
            setError(data);
          }
        } else if (Array.isArray(data)) {
          // Validation errors
          setError(data.map((e: any) => e.errorMessage || e.message).join(", "));
        } else {
          // Message (PascalCase - standard) or message (lowercase - custom)
          setError(data.Message || data.message || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
        }
      } else if (err.request) {
        setError("Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.");
      } else {
        setError("Giriş yapılırken teknik bir hata oluştu.");
      }
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Hesabınıza Giriş Yapın
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Develop Turkey Platformu
          </p>
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

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="username" className="sr-only">Kullanıcı Adı</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Kullanıcı Adı"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Şifre</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium">
              {error}
            </div>
          )}

          {/* Cloudflare Turnstile Bot Koruması */}
          <div className="flex justify-center">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={!captchaToken}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white transition duration-150 ease-in-out ${!captchaToken ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
            >
              Giriş Yap
            </button>
            <div className="mt-4 text-center">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Şifremi Unuttum</Link>
            </div>
            <div className="mt-4 text-center">
              <Link to="/register" className="text-sm text-blue-600 hover:underline">Kayıt Ol</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;