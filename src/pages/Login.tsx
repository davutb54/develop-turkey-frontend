// src/pages/Login.tsx
import { useState } from 'react';
import { userService } from '../services/userService';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await userService.login({ userName, password });
      
      // DEĞİŞİKLİK BURADA: response.data artık doğrudan Token objesidir.
      // Eğer token varsa işlem başarılıdır.
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);


    const base64Url = response.data.token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const tokenData = JSON.parse(jsonPayload);
    // JWT içindeki "nameid" genelde ID'yi tutar
    localStorage.setItem('userId', tokenData.nameid || tokenData.unique_name || tokenData.sub);


        
        // Kullanıcıya bilgi verelim (isteğe bağlı, direkt yönlendirebilirsin)
        // alert("Giriş Başarılı! Yönlendiriliyorsunuz...");
        
        navigate('/');
      } else {
        // Token gelmediyse bir sorun vardır
        setError("Giriş başarısız, token alınamadı.");
      }
    } catch (err: any) {
      // Backend'den gelen hata mesajını yakalama kısmı
      console.error("Login hatası:", err);
      if (err.response && err.response.data) {
        // Backend bazen string mesaj, bazen obje dönebilir
        setError(typeof err.response.data === 'string' 
          ? err.response.data 
          : err.response.data.message || "Kullanıcı adı veya şifre hatalı");
      } else {
        setError("Sunucuya bağlanılamadı.");
      }
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
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
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

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              Giriş Yap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;