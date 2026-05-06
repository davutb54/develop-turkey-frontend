import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { City, Gender, ProblemDetailDto, SolutionDetailDto, UserDetailDto } from '../types';
import Navbar from '../components/Navbar';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { constantService } from '../services/constantService';
import SearchableSelect from '../components/SearchableSelect';
import { topicService } from '../services/topicService';
import { useAuth } from '../context/AuthContext';
import { getProfileImageUrl } from '../utils/imageUtils';

const Profile = () => {
    const { userId } = useAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error] = useState('');
    const [uploading, setUploading] = useState(false);
    const [myProblems, setMyProblems] = useState<ProblemDetailDto[]>([]);
    const [mySolutions, setMySolutions] = useState<SolutionDetailDto[]>([]);
    const [activeTab, setActiveTab] = useState<'problems' | 'solutions' | 'settings'>('problems');
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

    // --- GERİ BİLDİRİM MESAJLARI (YENİ) ---
    const [passMessage, setPassMessage] = useState({ type: '', text: '' });
    const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPassUpdating, setIsPassUpdating] = useState(false);

    const [updateData, setUpdateData] = useState({
        name: '', surname: '', email: '', cityCode: 1, genderCode: 1
    });
    const [cities, setCities] = useState<City[]>([]);
    const [genders, setGenders] = useState<Gender[]>([]);

    // --- DÜZENLEME STATE'LERİ ---
    const [editingProblemId, setEditingProblemId] = useState<number | null>(null);
    const [editProblemData, setEditProblemData] = useState({ title: '', description: '' });

    const [editingSolutionId, setEditingSolutionId] = useState<number | null>(null);
    const [editSolutionData, setEditSolutionData] = useState({ title: '', description: '' });

    const [topics, setTopics] = useState<any[]>([]); // Tüm kategorileri tutacak
    const [editSelectedTopics, setEditSelectedTopics] = useState<number[]>([]); // Düzenlerken seçilen kategoriler

    useEffect(() => {
        if (userId !== null) {
            loadUserAndConstants();
            fetchProfileData();
        }
    }, [userId]);

    const loadUserAndConstants = async () => {
        if (!userId) { navigate('/login'); return; }

        try {
            const [userRes, citiesRes, gendersRes, topicsRes] = await Promise.all([
                userService.getMe(),
                constantService.getCities(),
                constantService.getGenders(),
                topicService.getAll()
            ]);

            if (citiesRes.data.success) setCities(citiesRes.data.data);
            if (gendersRes.data.success) setGenders(gendersRes.data.data);
            if (topicsRes.data.success) setTopics(topicsRes.data.data);

            if (userRes.data.success) {
                const u = userRes.data.data;
                setUser(u);
                setUpdateData({
                    name: u.name, surname: u.surname, email: u.email,
                    cityCode: u.cityCode || 1, genderCode: u.genderCode || 1
                });
            }
        } catch (error) { navigate('/'); }
        finally { setLoading(false); }
    };

    const fetchProfileData = async () => {
        if (!userId) return;

        try {
            const [probRes, solRes] = await Promise.all([
                problemService.getBySender(userId),
                solutionService.getBySender(userId)
            ]);

            if (probRes.data.success) setMyProblems(probRes.data.data);
            if (solRes.data.success) setMySolutions(solRes.data.data);
        } catch (err) {
            console.error("İçerik çekme hatası:", err);
        }
    };

    // --- GÜNCELLEME İŞLEMLERİ ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (!userId) return;

            setUploading(true);
            try {
                const response = await userService.uploadProfileImage({
                    userId: userId,
                    image: file
                });

                if (response.data.success || response.status === 200) {
                    // Sayfayı yenilemek yerine, kullanıcının güncel verisini arka planda tekrar çek!
                    const userRes = await userService.getMe();
                    if (userRes.data.success) {
                        setUser(userRes.data.data); // Profil resmi otomatik değişecek!
                    }
                }
            } catch (err) {
                alert("Resim yüklenirken bir hata oluştu.");
            } finally {
                setUploading(false);
            }
        }
    };

    const handleUpdateDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsUpdating(true);
        setUpdateMessage({ type: '', text: '' });

        try {
            await userService.updateDetails({
                id: user.id,
                name: updateData.name,
                surname: updateData.surname,
                email: updateData.email,
                cityCode: updateData.cityCode,
                genderCode: updateData.genderCode
            });
            setUpdateMessage({ type: 'success', text: 'Bilgileriniz başarıyla güncellendi! ✅' });
            loadUserAndConstants(); // Yeni verileri çek

            // 3 saniye sonra mesajı temizle
            setTimeout(() => setUpdateMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setUpdateMessage({ type: 'error', text: 'Bilgiler güncellenemedi. ❌' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage({ type: '', text: '' });

        if (passForm.newPassword !== passForm.confirmPassword) {
            setPassMessage({ type: 'error', text: 'Yeni şifreler uyuşmuyor. ❌' });
            return;
        }

        if (passForm.newPassword.length < 6) {
            setPassMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalı. ❌' });
            return;
        }

        if (!userId) return;

        setIsPassUpdating(true);
        try {
            const result = await userService.updatePassword({
                id: userId,
                oldPassword: passForm.oldPassword,
                newPassword: passForm.newPassword
            });

            if (result.data.success) {
                setPassMessage({ type: 'success', text: 'Şifreniz başarıyla değiştirildi! ✅' });
                setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => setPassMessage({ type: '', text: '' }), 3000);
            } else {
                setPassMessage({ type: 'error', text: result.data.message });
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || "Şifre güncellenemedi. ❌";
            setPassMessage({ type: 'error', text: msg });
        } finally {
            setIsPassUpdating(false);
        }
    };

    // --- SORUN İŞLEMLERİ ---
    const handleDeleteProblem = async (problem: any) => {
        if (!window.confirm("Bu sorunu silmek istediğinize emin misiniz? (Soruna ait çözümler ve yorumlar da silinebilir)")) return;
        try {
            await problemService.delete(problem.id);
            // Listeyi state üzerinden güncelle (Sayfa yenilemeden silinsin)
            setMyProblems(prev => prev.filter(p => p.id !== problem.id));
            alert("Sorun başarıyla silindi."); // Buraya daha sonra şık bir Toast eklenebilir
        } catch (err) { alert("Sorun silinemedi."); }
    };

    const handleUpdateProblem = async (problem: any) => {
        try {
            const updatedProblem = {
                ...problem,
                title: editProblemData.title,
                description: editProblemData.description,
                topicIds: editSelectedTopics
            };
            await problemService.update(updatedProblem);

            // Listeyi state üzerinden anında güncelle
            const updatedTopicObjects = topics.filter(t => editSelectedTopics.includes(t.id));
            setMyProblems(prev => prev.map(p => p.id === problem.id ? {
                ...p,
                title: editProblemData.title,
                description: editProblemData.description,
                topics: updatedTopicObjects // Arayüzdeki rozetler anında değişsin
            } : p));
            setEditingProblemId(null);
        } catch (err) { alert("Güncelleme başarısız oldu."); }
    };

    // --- ÇÖZÜM İŞLEMLERİ ---
    const handleDeleteSolution = async (solution: any) => {
        if (!window.confirm("Bu çözümü silmek istediğinize emin misiniz?")) return;
        try {
            await solutionService.delete(solution.id);
            // Listeyi state üzerinden güncelle
            setMySolutions(prev => prev.filter(s => s.id !== solution.id));
        } catch (err) { alert("Çözüm silinemedi."); }
    };

    const handleUpdateSolution = async (solution: any) => {
        try {
            const updatedSolution = {
                ...solution,
                title: editSolutionData.title,
                description: editSolutionData.description
            };
            await solutionService.update(updatedSolution);

            // Listeyi state üzerinden anında güncelle
            setMySolutions(prev => prev.map(s => s.id === solution.id ? { ...s, title: editSolutionData.title, description: editSolutionData.description } : s));
            setEditingSolutionId(null);
        } catch (err) { alert("Güncelleme başarısız oldu."); }
    };

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
                                        src={getProfileImageUrl(user.profileImageUrl)}
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
                                    {user?.isAdmin && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">Yönetici</span>}
                                    {user?.isExpert && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">Uzman</span>}
                                    {user?.isOfficial && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">Resmi Makam</span>}
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
                                            className="px-2 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 transition text-[10px] font-bold rounded-full uppercase tracking-wider cursor-pointer shadow-sm"
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
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold shadow-sm ${user?.emailNotificationPermission ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                                        {user?.emailNotificationPermission ? 'AÇIK' : 'KAPALI'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sekme Menüsü */}
                <div className="bg-white shadow-md rounded-xl overflow-hidden mt-6">
                    <div className="flex border-b overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('problems')}
                            className={`flex-1 min-w-[120px] py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'problems' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Sorunlarım ({myProblems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('solutions')}
                            className={`flex-1 min-w-[120px] py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'solutions' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Çözümlerim ({mySolutions.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 min-w-[120px] py-4 text-sm font-bold tracking-wider uppercase px-4 transition-colors ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Ayarlar
                        </button>
                    </div>

                    <div className="p-6 min-h-[300px]">
                        {/* SORUNLARIM SEKMESİ */}
                        {activeTab === 'problems' && (
                            <div className="space-y-4 animate-fade-in">
                                {myProblems.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-4xl mb-3">📝</div>
                                        <p className="text-gray-500 font-medium">Henüz bir sorun paylaşmadınız.</p>
                                    </div>
                                ) : (
                                    myProblems.map(prob => (
                                        <div key={prob.id} className="p-5 border border-gray-100 rounded-xl hover:shadow-md transition bg-white shadow-sm">
                                            {editingProblemId === prob.id ? (
                                                <div className="space-y-3 animate-fade-in-down bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-2.5 rounded-lg font-bold"
                                                        value={editProblemData.title}
                                                        onChange={e => setEditProblemData({ ...editProblemData, title: e.target.value })}
                                                    />
                                                    <textarea
                                                        className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-2.5 rounded-lg text-sm"
                                                        rows={4}
                                                        value={editProblemData.description}
                                                        onChange={e => setEditProblemData({ ...editProblemData, description: e.target.value })}
                                                    ></textarea>
                                                    {/* YENİ: DÜZENLEME EKRANINDAKİ ÇOKLU KATEGORİ SEÇİCİ */}
                                                    <div className="pt-2 border-t border-gray-200 mt-2">
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">İlgili Kategoriler</label>
                                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                                            {topics.map(topic => {
                                                                const isSelected = editSelectedTopics.includes(topic.id);
                                                                return (
                                                                    <button
                                                                        key={topic.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditSelectedTopics(prev =>
                                                                                prev.includes(topic.id)
                                                                                    ? prev.filter(id => id !== topic.id)
                                                                                    : [...prev, topic.id]
                                                                            );
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-200 active:scale-95 flex items-center gap-1 ${isSelected
                                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30'
                                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'
                                                                            }`}
                                                                    >
                                                                        {topic.name}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 justify-end pt-2">
                                                        <button onClick={() => setEditingProblemId(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition shadow-sm">İptal</button>
                                                        <button onClick={() => handleUpdateProblem(prob)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-md active:scale-95">Kaydet</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                                                        {prob.topics?.map(t => (
                                                            <span key={t.id} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                                {t.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-start mb-2 gap-4">
                                                        <h4 className="font-bold text-gray-900 text-lg leading-tight">{prob.title}</h4>
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md font-medium whitespace-nowrap border border-gray-200">{new Date(prob.sendDate).toLocaleDateString('tr-TR')}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 line-clamp-2 mb-5 leading-relaxed">{prob.description}</p>
                                                    <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                                        <Link to={`/problem/${prob.id}`} className="text-blue-600 text-sm font-bold hover:text-blue-800 transition flex items-center gap-1">İncele <span className="text-lg leading-none">›</span></Link>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingProblemId(prob.id);
                                                                    setEditProblemData({ title: prob.title, description: prob.description });
                                                                    setEditSelectedTopics(prob.topics ? prob.topics.map((t: any) => t.id) : []);
                                                                }}
                                                                className="px-4 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold hover:bg-yellow-100 transition shadow-sm active:scale-95"
                                                            >
                                                                Düzenle
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProblem(prob)}
                                                                className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition shadow-sm active:scale-95"
                                                            >
                                                                Sil
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ÇÖZÜMLERİM SEKMESİ */}
                        {activeTab === 'solutions' && (
                            <div className="space-y-4 animate-fade-in">
                                {mySolutions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-4xl mb-3">💡</div>
                                        <p className="text-gray-500 font-medium">Henüz bir çözüm önerisinde bulunmadınız.</p>
                                    </div>
                                ) : (
                                    mySolutions.map(sol => (
                                        <div key={sol.id} className="p-5 border border-gray-100 rounded-xl hover:shadow-md transition mb-4 bg-white shadow-sm">
                                            {editingSolutionId === sol.id ? (
                                                <div className="space-y-3 animate-fade-in-down bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-2.5 rounded-lg font-bold"
                                                        value={editSolutionData.title}
                                                        onChange={e => setEditSolutionData({ ...editSolutionData, title: e.target.value })}
                                                    />
                                                    <textarea
                                                        className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-2.5 rounded-lg text-sm"
                                                        rows={4}
                                                        value={editSolutionData.description}
                                                        onChange={e => setEditSolutionData({ ...editSolutionData, description: e.target.value })}
                                                    ></textarea>
                                                    <div className="flex gap-2 justify-end pt-2">
                                                        <button onClick={() => setEditingSolutionId(null)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition shadow-sm">İptal</button>
                                                        <button onClick={() => handleUpdateSolution(sol)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-md active:scale-95">Kaydet</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex justify-between items-start mb-2 gap-4">
                                                        <h4 className="font-bold text-gray-900 text-lg leading-tight">{sol.title}</h4>
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md font-medium whitespace-nowrap border border-gray-200">{new Date(sol.sendDate).toLocaleDateString('tr-TR')}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 line-clamp-2 mb-5 leading-relaxed">{sol.description}</p>
                                                    <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                                        <Link to={`/problem/${sol.problemId}?solution=${sol.id}`} className="text-blue-600 text-sm font-bold hover:text-blue-800 transition flex items-center gap-1">Soruna Git <span className="text-lg leading-none">›</span></Link>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => { setEditingSolutionId(sol.id); setEditSolutionData({ title: sol.title, description: sol.description }); }} className="px-4 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold hover:bg-yellow-100 transition shadow-sm active:scale-95">Düzenle</button>
                                                            <button onClick={() => handleDeleteSolution(sol)} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition shadow-sm active:scale-95">Sil</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* AYARLAR SEKMESİ */}
                        {activeTab === 'settings' && (
                            <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-12 pt-2">
                                {/* Form 1: Profil Bilgileri */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Bilgileri Güncelle</h2>
                                    <form onSubmit={handleUpdateDetails} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Ad</label><input type="text" className="w-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={updateData.name} onChange={e => setUpdateData({ ...updateData, name: e.target.value })} required /></div>
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Soyad</label><input type="text" className="w-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={updateData.surname} onChange={e => setUpdateData({ ...updateData, surname: e.target.value })} required /></div>
                                        </div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">E-Posta</label><input type="email" className="w-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={updateData.email} onChange={e => setUpdateData({ ...updateData, email: e.target.value })} required /></div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Şehir</label>
                                                <div className="h-[46px]">
                                                    <SearchableSelect
                                                        options={cities.filter(c => c.value !== 0).map(c => ({ value: c.value, label: c.text }))}
                                                        value={updateData.cityCode}
                                                        onChange={(val) => setUpdateData({ ...updateData, cityCode: Number(val) })}
                                                        placeholder="Şehir Seçiniz"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Cinsiyet</label>
                                                <select
                                                    className="w-full h-[46px] border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none px-3 rounded-md bg-white transition cursor-pointer text-sm"
                                                    value={updateData.genderCode}
                                                    onChange={e => setUpdateData({ ...updateData, genderCode: parseInt(e.target.value) })}
                                                >
                                                    {genders.map(gender => (
                                                        <option key={gender.key} value={gender.value}>{gender.text}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {updateMessage.text && (
                                            <div className={`p-3 rounded-xl text-sm font-bold mt-4 animate-fade-in-down ${updateMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                {updateMessage.text}
                                            </div>
                                        )}

                                        <button type="submit" disabled={isUpdating} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/30 mt-6 disabled:bg-blue-400 active:scale-95 flex justify-center items-center gap-2">
                                            {isUpdating ? (
                                                <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Kaydediliyor...</>
                                            ) : 'Bilgileri Kaydet'}
                                        </button>
                                    </form>
                                </div>

                                {/* Form 2: Şifre Değiştirme */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
                                    <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Şifre Değiştir</h2>
                                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Eski Şifreniz</label><input type="password" placeholder="Mevcut şifreniz" className="w-full border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={passForm.oldPassword} onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })} required /></div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Yeni Şifre</label><input type="password" placeholder="En az 6 karakter" minLength={6} className="w-full border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} required /></div>
                                        <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Yeni Şifre (Tekrar)</label><input type="password" placeholder="Yeni şifrenizi doğrulayın" minLength={6} className="w-full border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={passForm.confirmPassword} onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })} required /></div>

                                        {passMessage.text && (
                                            <div className={`p-3 rounded-xl text-sm font-bold mt-4 animate-fade-in-down ${passMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                {passMessage.text}
                                            </div>
                                        )}

                                        <button type="submit" disabled={isPassUpdating} className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-md mt-6 disabled:bg-gray-500 active:scale-95 flex justify-center items-center gap-2">
                                            {isPassUpdating ? (
                                                <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Güncelleniyor...</>
                                            ) : 'Şifreyi Güncelle'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;