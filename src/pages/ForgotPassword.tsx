import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.forgotPassword(email);
            // Kod gönderildiyse Reset sayfasına yönlendir
            navigate('/reset-password', { state: { email } });
        } catch (err: any) {
            console.error("Mail gönderme hatası:", err);
            const data = err.response?.data;
            const contentType = err.response?.headers?.['content-type'] || '';
            
            let errorMessage = "Mail gönderilemedi. Lütfen e-posta adresinizi kontrol edin.";
            
            if (data) {
                if (typeof data === 'string' && (data.includes('<!DOCTYPE') || data.includes('<html') || contentType.includes('text/html'))) {
                    errorMessage = "Sunucu şu anda yanıt vermiyor. Lütfen daha sonra tekrar deneyin.";
                } else {
                    errorMessage = data.Message || data.message || (typeof data === 'string' ? data : errorMessage);
                }
            }
            
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-center mb-6">Şifremi Unuttum</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-gray-600 text-center">Hesabınıza kayıtlı e-posta adresini girin, size bir sıfırlama kodu gönderelim.</p>
                    <input 
                        type="email" required placeholder="E-Posta Adresi"
                        className="w-full border p-2 rounded focus:ring-blue-500"
                        value={email} onChange={e => setEmail(e.target.value)}
                    />
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                        {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm text-blue-600 hover:underline">Giriş sayfasına dön</Link>
                </div>
            </div>
        </div>
    );
};
export default ForgotPassword;