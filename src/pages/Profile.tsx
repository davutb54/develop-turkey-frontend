import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { City, Gender, ProblemDetailDto, SolutionDetailDto, UserDetailDto } from '../types';
import Navbar from '../components/Navbar';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { constantService } from '../services/constantService';

const Profile = () => {
    const [user, setUser] = useState<UserDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [myProblems, setMyProblems] = useState<ProblemDetailDto[]>([]);
    const [mySolutions, setMySolutions] = useState<SolutionDetailDto[]>([]);
    const [activeTab, setActiveTab] = useState<'problems' | 'solutions' | 'settings'>('problems');
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [, setPassMessage] = useState({ type: '', text: '' });
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

    const navigate = useNavigate();

    useEffect(() => {
        loadUserAndConstants();
    }, []);

    const loadUserAndConstants = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) { navigate('/login'); return; }

        try {
            // Kullanıcı verisini ve Sabitleri aynı anda paralel çekiyoruz
            const [userRes, citiesRes, gendersRes] = await Promise.all([
                userService.getById(parseInt(userId)),
                constantService.getCities(),
                constantService.getGenders()
            ]);

            if (citiesRes.data.success) setCities(citiesRes.data.data);
            if (gendersRes.data.success) setGenders(gendersRes.data.data);

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

    const handleUpdateDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            await userService.updateDetails({
                id: user.id,
                name: updateData.name,
                surname: updateData.surname,
                email: updateData.email,
                cityCode: updateData.cityCode,
                genderCode: updateData.genderCode
            });
            alert("Bilgileriniz başarıyla güncellendi!");
            loadUserAndConstants();
        } catch (err) { alert("Bilgiler güncellenemedi."); }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
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

    // SORUN İŞLEMLERİ
    const handleDeleteProblem = async (problem: any) => {
        if (!window.confirm("Bu sorunu silmek istediğinize emin misiniz? (Soruna ait çözümler ve yorumlar da silinebilir)")) return;
        try {
            await problemService.delete(problem.id);
            alert("Sorun başarıyla silindi.");
            // TODO: Listeni yenile (Örn: fetchProblems() fonksiyonunu çağır)
        } catch (err) { alert("Sorun silinemedi."); }
    };

    const handleUpdateProblem = async (problem: any) => {
        try {
            // Mevcut nesnenin sadece değişen yerlerini eziyoruz
            const updatedProblem = {
                ...problem,
                title: editProblemData.title,
                description: editProblemData.description
            };
            await problemService.update(updatedProblem);
            alert("Sorun başarıyla güncellendi.");
            setEditingProblemId(null);
            // TODO: Listeni yenile
        } catch (err) { alert("Güncelleme başarısız oldu."); }
    };

    // ÇÖZÜM İŞLEMLERİ
    const handleDeleteSolution = async (solution: any) => {
        if (!window.confirm("Bu çözümü silmek istediğinize emin misiniz?")) return;
        try {
            await solutionService.delete(solution.id);
            alert("Çözüm başarıyla silindi.");
            // TODO: Listeni yenile
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
            alert("Çözüm başarıyla güncellendi.");
            setEditingSolutionId(null);
            // TODO: Listeni yenile
        } catch (err) { alert("Güncelleme başarısız oldu."); }
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
                                        src={`/uploads/profiles/${user.profileImageUrl}`}
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
                                {myProblems.map(prob => (
                                    <div key={prob.id} className="p-4 border rounded-xl hover:bg-gray-50 transition mb-4 bg-white shadow-sm">

                                        {editingProblemId === prob.id ? (
                                            // DÜZENLEME MODU (FORM)
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    className="w-full border p-2 rounded-lg font-bold"
                                                    value={editProblemData.title}
                                                    onChange={e => setEditProblemData({ ...editProblemData, title: e.target.value })}
                                                />
                                                <textarea
                                                    className="w-full border p-2 rounded-lg text-sm"
                                                    rows={4}
                                                    value={editProblemData.description}
                                                    onChange={e => setEditProblemData({ ...editProblemData, description: e.target.value })}
                                                ></textarea>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => setEditingProblemId(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold">İptal</button>
                                                    <button onClick={() => handleUpdateProblem(prob)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Kaydet</button>
                                                </div>
                                            </div>
                                        ) : (
                                            // NORMAL GÖRÜNÜM MODU
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-gray-900 text-lg">{prob.title}</h4>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{new Date(prob.sendDate).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{prob.description}</p>

                                                <div className="flex justify-between items-center border-t pt-3">
                                                    <Link to={`/problem/${prob.id}`} className="text-blue-600 text-sm font-bold hover:underline">İncele & Git</Link>
                                                    <div className="flex gap-2">
                                                        {/* DÜZENLE BUTONU */}
                                                        <button
                                                            onClick={() => {
                                                                setEditingProblemId(prob.id);
                                                                setEditProblemData({ title: prob.title, description: prob.description });
                                                            }}
                                                            className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold hover:bg-yellow-100 transition"
                                                        >
                                                            Düzenle
                                                        </button>
                                                        {/* SİL BUTONU */}
                                                        <button
                                                            onClick={() => handleDeleteProblem(prob)}
                                                            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}  {activeTab === 'solutions' && (
                            <div className="space-y-4">
                                {mySolutions.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10">Henüz bir çözüm önerisinde bulunmadınız.</p>
                                ) : (
                                    mySolutions.map(sol => (
                                        <div key={sol.id} className="p-4 border rounded-xl hover:bg-gray-50 transition mb-4 bg-white shadow-sm">

                                            {editingSolutionId === sol.id ? (
                                                <div className="space-y-3">
                                                    <input type="text" className="w-full border p-2 rounded-lg font-bold" value={editSolutionData.title} onChange={e => setEditSolutionData({ ...editSolutionData, title: e.target.value })} />
                                                    <textarea className="w-full border p-2 rounded-lg text-sm" rows={4} value={editSolutionData.description} onChange={e => setEditSolutionData({ ...editSolutionData, description: e.target.value })}></textarea>
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => setEditingSolutionId(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold">İptal</button>
                                                        <button onClick={() => handleUpdateSolution(sol)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Kaydet</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-900 text-lg">{sol.title}</h4>
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{new Date(sol.sendDate).toLocaleDateString('tr-TR')}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{sol.description}</p>

                                                    <div className="flex justify-between items-center border-t pt-3">
                                                        <Link to={`/problem/${sol.problemId}`} className="text-blue-600 text-sm font-bold hover:underline">İlgili Soruna Git</Link>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => { setEditingSolutionId(sol.id); setEditSolutionData({ title: sol.title, description: sol.description }); }} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold hover:bg-yellow-100 transition">Düzenle</button>
                                                            <button onClick={() => handleDeleteSolution(sol)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition">Sil</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )} {activeTab === 'settings' && (
                            <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-12">

                                {/* Form 1: Profil Bilgileri */}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">Bilgileri Güncelle</h2>
                                    <form onSubmit={handleUpdateDetails} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Ad</label><input type="text" className="w-full border p-2.5 rounded-xl bg-gray-50" value={updateData.name} onChange={e => setUpdateData({ ...updateData, name: e.target.value })} required /></div>
                                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Soyad</label><input type="text" className="w-full border p-2.5 rounded-xl bg-gray-50" value={updateData.surname} onChange={e => setUpdateData({ ...updateData, surname: e.target.value })} required /></div>
                                        </div>
                                        <div><label className="block text-xs font-bold text-gray-600 mb-1">E-Posta</label><input type="email" className="w-full border p-2.5 rounded-xl bg-gray-50" value={updateData.email} onChange={e => setUpdateData({ ...updateData, email: e.target.value })} required /></div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* DİNAMİK ŞEHİR SEÇİMİ */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Şehir</label>
                                                <select
                                                    className="w-full border p-2.5 rounded-xl bg-gray-50"
                                                    value={updateData.cityCode}
                                                    onChange={e => setUpdateData({ ...updateData, cityCode: parseInt(e.target.value) })}
                                                >
                                                    {cities.map(city => (
                                                        <option key={city.key} value={city.value}>{city.text}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* DİNAMİK CİNSİYET SEÇİMİ */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Cinsiyet</label>
                                                <select
                                                    className="w-full border p-2.5 rounded-xl bg-gray-50"
                                                    value={updateData.genderCode}
                                                    onChange={e => setUpdateData({ ...updateData, genderCode: parseInt(e.target.value) })}
                                                >
                                                    {genders.map(gender => (
                                                        <option key={gender.key} value={gender.value}>{gender.text}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">Bilgileri Kaydet</button>
                                    </form>
                                </div>

                                {/* Form 2: Şifre Değiştirme */}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">Şifre Değiştir</h2>
                                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Eski Şifreniz</label><input type="password" placeholder="Mevcut şifreniz" className="w-full border p-2.5 rounded-xl bg-gray-50" value={passForm.oldPassword} onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })} required /></div>
                                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Yeni Şifre</label><input type="password" placeholder="En az 6 karakter" minLength={6} className="w-full border p-2.5 rounded-xl bg-gray-50" value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} required /></div>
                                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Yeni Şifre (Tekrar)</label><input type="password" placeholder="Yeni şifrenizi doğrulayın" minLength={6} className="w-full border p-2.5 rounded-xl bg-gray-50" value={passForm.confirmPassword} onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })} required /></div>

                                        <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition">Şifreyi Güncelle</button>
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