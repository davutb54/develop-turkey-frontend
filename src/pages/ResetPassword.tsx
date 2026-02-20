import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState(location.state?.email || '');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.resetPassword({ email, code: parseInt(code), newPassword });
            alert("Şifreniz başarıyla sıfırlandı! Lütfen yeni şifrenizle giriş yapın.");
            navigate('/login');
        } catch (err: any) {
            alert(err.response?.data?.message || "Şifre sıfırlanamadı.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-center mb-6">Yeni Şifre Belirle</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="email" required disabled={!!location.state?.email} placeholder="E-Posta Adresi" className="w-full border p-2 rounded bg-gray-50" value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="text" required maxLength={6} placeholder="6 Haneli Kod" className="w-full border p-2 rounded text-center tracking-widest font-bold" value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} />
                    <input type="password" required minLength={6} placeholder="Yeni Şifre (En az 6 karakter)" className="w-full border p-2 rounded" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    
                    <button type="submit" disabled={loading || code.length < 6} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                        {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default ResetPassword;