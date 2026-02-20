import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = location.state?.email || '';

  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  
  // SAYAÇ İÇİN STATE'LER
  const [timeLeft, setTimeLeft] = useState(120); 
  const [canResend, setCanResend] = useState(false);

  // Geri Sayım Efekti
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage({ type: '', text: '' });
    try {
      const result = await authService.verifyEmail({ email, code: parseInt(code) });
      if (result.data.success || result.status === 200) {
        setMessage({ type: 'success', text: "Başarıyla doğrulandı! Yönlendiriliyorsunuz..." });
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || "Doğrulama başarısız." });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setMessage({ type: 'error', text: "Lütfen önce e-posta adresinizi girin." });
      return;
    }
    setCanResend(false);
    setTimeLeft(120); // Sayacı başa sar
    setMessage({ type: '', text: '' });
    try {
      await authService.resendVerification(email);
      setMessage({ type: 'success', text: "Yeni kod gönderildi. Lütfen e-postanızı kontrol edin." });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || "Kod gönderilemedi." });
      setCanResend(true); // Hata olursa hemen tekrar denemesine izin ver
      setTimeLeft(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-10 rounded-xl shadow-lg">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">E-Posta Doğrulama</h2>
        
        <form className="mt-8 space-y-4" onSubmit={handleVerify}>
          <input
            type="email" required disabled={!!emailFromState}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            placeholder="E-Posta Adresi"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="text" required maxLength={6}
            className="w-full px-3 py-3 border border-gray-300 rounded-md text-center tracking-[0.5em] text-lg font-bold"
            placeholder="123456"
            value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          />
          
          {message.text && (
            <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading || code.length < 6} className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400">
            {loading ? 'Doğrulanıyor...' : 'Doğrula'}
          </button>
        </form>

        {/* TEKRAR GÖNDER BUTONU */}
        <div className="text-center mt-4">
          <button 
            onClick={handleResend} 
            disabled={!canResend}
            className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            {canResend ? "Kodu Tekrar Gönder" : `Kodu Tekrar Gönder (${timeLeft}s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;