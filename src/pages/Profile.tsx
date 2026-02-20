import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { ProblemDetailDto, SolutionDetailDto, UserDetailDto } from '../types';
import Navbar from '../components/Navbar';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const Profile = () => {
    const [user, setUser] = useState<UserDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [myProblems, setMyProblems] = useState<ProblemDetailDto[]>([]);
    const [mySolutions, setMySolutions] = useState<SolutionDetailDto[]>([]);
    const [activeTab, setActiveTab] = useState<'problems' | 'solutions' | 'settings'>('problems');
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passMessage, setPassMessage] = useState({ type: '', text: '' });

    const navigate = useNavigate();


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const userId = localStorage.getItem('userId');

            if (!userId) return;

            setUploading(true);
            try {
                // userService içindeki uploadProfileImage servisini kullanıyoruz
                const response = await userService.uploadProfileImage({
                    userId: parseInt(userId),
                    image: file
                });

                if (response.data.success || response.status === 200) {
                    alert("Profil resmi başarıyla güncellendi!");
                    // Sayfayı yenileyerek yeni resmi çekelim
                    window.location.reload();
                }
            } catch (err) {
                alert("Resim yüklenirken bir hata oluştu.");
            } finally {
                setUploading(false);
            }
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage({ type: '', text: '' });

        if (passForm.newPassword !== passForm.confirmPassword) {
            setPassMessage({ type: 'error', text: 'Yeni şifreler uyuşmuyor.' });
            return;
        }

        if (passForm.newPassword.length < 6) {
            setPassMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalı.' });
            return;
        }

        const userId = localStorage.getItem('userId');
        if (!userId) return;

        try {
            const result = await userService.updatePassword({
                id: parseInt(userId),
                oldPassword: passForm.oldPassword,
                newPassword: passForm.newPassword
            });

            if (result.data.success) {
                setPassMessage({ type: 'success', text: result.data.message });
                setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPassMessage({ type: 'error', text: result.data.message });
            }
        } catch (err: any) {
            // Backend hatasını yakala
            const msg = err.response?.data?.message || "Şifre güncellenemedi.";
            setPassMessage({ type: 'error', text: msg });
        }
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setError("Kullanıcı oturumu bulunamadı.");
                setLoading(false);
                return;
            }

            try {
                const response = await userService.getById(parseInt(userId));
                if (response.data.success) {
                    setUser(response.data.data);
                } else {
                    setError(response.data.message);
                }
            } catch (err) {
                setError("Profil bilgileri yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    useEffect(() => {
        const fetchProfileData = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            try {
                const id = parseInt(userId);
                // Tüm verileri paralel olarak çekelim
                const [userRes, probRes, solRes] = await Promise.all([
                    userService.getById(id),
                    problemService.getBySender(id),
                    solutionService.getBySender(id)
                ]);

                if (userRes.data.success) setUser(userRes.data.data);
                if (probRes.data.success) setMyProblems(probRes.data.data);
                if (solRes.data.success) setMySolutions(solRes.data.data);
            } catch (err) {
                console.error("Veri çekme hatası:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, []);

    if (loading) return <div className="text-center p-10 font-medium text-blue-600">Profil Yükleniyor...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto py-12 px-4">
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                    <div className="relative px-6 pb-8">
                        {/* Profil Resmi ve Yükleme Butonu */}
                        <div className="absolute -top-16 left-6 group">
                            <div className="h-32 w-32 rounded-full border-4 border-white overflow-hidden bg-gray-200 shadow-lg relative">
                                {user?.profileImageUrl ? (
                                    <img
                                        src={`https://localhost:7216/uploads/profiles/${user.profileImageUrl}`}
                                        alt="Profil"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-4xl font-bold bg-blue-100">
                                        {user?.name[0]}{user?.surname[0]}
                                    </div>
                                )}

                                {/* Overlay: Üzerine gelince "Değiştir" yazısı çıksın */}
                                <label htmlFor="profile-upload" className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200">
                                    <span className="text-white text-xs font-bold text-center px-2">
                                        {uploading ? 'Yükleniyor...' : 'RESMİ DEĞİŞTİR'}
                                    </span>
                                    <input
                                        id="profile-upload"
                                        type="file"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* İsim ve Ünvanlar */}
                        <div className="pt-20">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h1 className="text-3xl font-extrabold text-gray-900">{user?.name} {user?.surname}</h1>
                                    <p className="text-gray-500 font-medium">@{user?.userName}</p>
                                </div>
                                <div className="flex gap-2">
                                    {user?.isAdmin && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">Yönetici</span>}
                                    {user?.isExpert && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Uzman</span>}
                                    {user?.isOfficial && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">Resmi Makam</span>}
                                </div>
                            </div>
                        </div>

                        {/* Bilgi Listesi */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-8">
                            <div className="space-y-4">
                                <div className="flex items-center text-gray-700">
                                    <span className="w-24 font-bold text-gray-500 uppercase text-xs">E-Posta:</span>
                                    <span className="font-medium mr-3">{user?.email}</span>

                                    {/* DOĞRULAMA ROZETİ VE BUTONU */}
                                    {user?.isEmailVerified ? (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Doğrulandı</span>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await authService.resendVerification(user!.email);
                                                    navigate('/verify-email', { state: { email: user!.email } });
                                                } catch (err) { alert("Kod gönderilemedi."); }
                                            }}
                                            className="px-2 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 transition text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer"
                                        >
                                            Hesabı Doğrula
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <span className="w-24 font-bold text-gray-500 uppercase text-xs">Şehir:</span>
                                    <span className="font-medium">{user?.cityName}</span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <span className="w-24 font-bold text-gray-500 uppercase text-xs">Cinsiyet:</span>
                                    <span className="font-medium">{user?.gender}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center text-gray-700">
                                    <span className="w-32 font-bold text-gray-500 uppercase text-xs">Kayıt Tarihi:</span>
                                    <span className="font-medium">{user && new Date(user.registerDate).toLocaleDateString('tr-TR')}</span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <span className="w-32 font-bold text-gray-500 uppercase text-xs">Bildirimler:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${user?.emailNotificationPermission ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                                        {user?.emailNotificationPermission ? 'AÇIK' : 'KAPALI'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sekme Menüsü */}
                <div className="bg-white shadow-md rounded-xl overflow-hidden">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('problems')}
                            className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'problems' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Sorunlarım ({myProblems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('solutions')}
                            className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'solutions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Çözümlerim ({mySolutions.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase whitespace-nowrap px-4 transition-colors ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Ayarlar
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'problems' && (
                            <div className="space-y-4">
                                {myProblems.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10">Henüz bir sorun paylaşmadınız.</p>
                                ) : (
                                    myProblems.map(prob => (
                                        <div key={prob.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{prob.title}</h4>
                                                <p className="text-xs text-gray-500">{prob.cityName} • {new Date(prob.sendDate).toLocaleDateString('tr-TR')}</p>
                                            </div>
                                            <Link to={`/problem/${prob.id}`} className="text-blue-600 text-sm font-bold hover:underline">Görüntüle</Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}  {activeTab === 'solutions' && (
                            <div className="space-y-4">
                                {mySolutions.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10">Henüz bir çözüm önerisinde bulunmadınız.</p>
                                ) : (
                                    mySolutions.map(sol => (
                                        <div key={sol.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                                            <div className="flex justify-between mb-2">
                                                <h4 className="font-bold text-gray-900">{sol.title}</h4>
                                                <span className="text-xs text-gray-500">{new Date(sol.sendDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{sol.description}</p>
                                            <Link to={`/problem/${sol.problemId}`} className="text-xs text-blue-600 font-bold hover:underline italic">
                                                Sorun: {sol.problemName}
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        )} {activeTab === 'settings' && (
                            <div className="max-w-md mx-auto">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Şifre Değiştir</h3>

                                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mevcut Şifre</label>
                                        <input
                                            type="password"
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={passForm.oldPassword}
                                            onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Yeni Şifre</label>
                                        <input
                                            type="password"
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={passForm.newPassword}
                                            onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Yeni Şifre (Tekrar)</label>
                                        <input
                                            type="password"
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={passForm.confirmPassword}
                                            onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                                        />
                                    </div>

                                    {passMessage.text && (
                                        <div className={`text-sm p-3 rounded ${passMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {passMessage.text}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                                    >
                                        Şifreyi Güncelle
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;