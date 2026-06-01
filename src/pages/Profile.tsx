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
import { useCapability } from '../hooks/useCapability';
import { getProfileImageUrl } from '../utils/imageUtils';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet';
import { useFeature, useInstitution, useTerminology } from '../hooks/useFeature';
import { actionService } from '../services/actionService';

const Profile = () => {
    const { userId } = useAuth();
    const navigate = useNavigate();

    // Capability guards
    const canUpdateProfile      = useCapability('user.profile_update');
    const canChangeAvatar       = useCapability('user.profile_avatar_change');
    const canChangePassword     = useCapability('user.profile_password_change');
    const canUpdateOwnProblem   = useCapability('user.problem_update_own');
    const canDeleteOwnProblem   = useCapability('user.problem_delete_own');
    const canUpdateOwnSolution  = useCapability('user.solution_update_own');
    const canDeleteOwnSolution  = useCapability('user.solution_delete_own');
    const enableMapLocation = useFeature<boolean>('Content.EnableMapLocation', true);
    const [user, setUser] = useState<UserDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error] = useState('');
    const [uploading, setUploading] = useState(false);
    const [myProblems, setMyProblems] = useState<ProblemDetailDto[]>([]);
    const [mySolutions, setMySolutions] = useState<SolutionDetailDto[]>([]);
    const [savedSolutions, setSavedSolutions] = useState<SolutionDetailDto[]>([]);
    const [activeTab, setActiveTab] = useState<'problems' | 'solutions' | 'saved' | 'settings'>('problems');
    const enableSavedSolutions = useFeature<boolean>('Social.EnableSavedSolutions', true);
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

    // --- GERİ BİLDİRİM MESAJLARI (YENİ) ---
    const [passMessage, setPassMessage] = useState({ type: '', text: '' });
    const [updateMessage, setUpdateMessage] = useState({ type: '', text: '' });
    const [prefMessage, setPrefMessage] = useState({ type: '', text: '' });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPassUpdating, setIsPassUpdating] = useState(false);

    const [updateData, setUpdateData] = useState({
        userName: '',
        name: '', surname: '', email: '', cityCode: 1, genderCode: 1,
        customHierarchyId: null as number | null,
        mentionNotificationEnabled: true,
        isProfilePublic: true,
        showSolutions: true,
        showProblems: true
    });
    const institution = useInstitution();
    const terminology = useTerminology();
    const [cities, setCities] = useState<City[]>([]);
    const [genders, setGenders] = useState<Gender[]>([]);

    // --- DÜZENLEME STATE'LERİ ---
    const [editingProblemId, setEditingProblemId] = useState<number | null>(null);
    const [editProblemData, setEditProblemData] = useState({ title: '', description: '' });

    const [editingSolutionId, setEditingSolutionId] = useState<number | null>(null);
    const [editSolutionData, setEditSolutionData] = useState({ title: '', description: '' });

    const [topics, setTopics] = useState<any[]>([]); // Tüm kategorileri tutacak
    const [editSelectedTopics, setEditSelectedTopics] = useState<number[]>([]); // Düzenlerken seçilen kategoriler

    // Sorun düzenlerken: konum + resim
    const DEFAULT_CENTER: [number, number] = [39.0, 35.0];
    const [editAddress, setEditAddress] = useState('');
    const [editLatitude, setEditLatitude] = useState<number | null>(null);
    const [editLongitude, setEditLongitude] = useState<number | null>(null);
    const [editClearLocation, setEditClearLocation] = useState(false);
    const [editImage, setEditImage] = useState<File | null>(null);
    const [editIsLocating, setEditIsLocating] = useState(false);
    const [editLocationError, setEditLocationError] = useState('');
    const [editIsResolvingCity, setEditIsResolvingCity] = useState(false);
    const [editAutoCityName, setEditAutoCityName] = useState<string | null>(null);
    const [editCityCode, setEditCityCode] = useState<number>(-1);
    const [editCustomHierarchyId, setEditCustomHierarchyId] = useState<number | null>(null);

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
                    userName: u.userName,
                    name: u.name, surname: u.surname, email: u.email,
                    cityCode: u.cityCode || 1, genderCode: u.genderCode || 1,
                    customHierarchyId: u.customHierarchyId ?? null,
                    mentionNotificationEnabled: u.mentionNotificationEnabled,
                    isProfilePublic: u.isProfilePublic,
                    showSolutions: u.showSolutions,
                    showProblems: u.showProblems
                });
            }
        } catch (error) { navigate('/'); }
        finally { setLoading(false); }
    };

    const fetchProfileData = async () => {
        if (!userId) return;

        try {
            const [probRes, solRes, savedRes] = await Promise.all([
                problemService.getBySender(userId),
                solutionService.getBySender(userId),
                actionService.getMySavedSolutions()
            ]);

            if (probRes.data.success) setMyProblems(probRes.data.data);
            if (solRes.data.success) setMySolutions(solRes.data.data);
            if (savedRes.data.success) setSavedSolutions(savedRes.data.data);
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

    const handleUpdateDetails = async (e: React.FormEvent, target: 'profile' | 'preferences' = 'profile') => {
        e.preventDefault();
        if (!user) return;

        setIsUpdating(true);
        const setMessage = target === 'profile' ? setUpdateMessage : setPrefMessage;
        setMessage({ type: '', text: '' });

        try {
            const trimmedUsername = (updateData.userName || '').trim();
            const usernameChanged = trimmedUsername.length > 0 && trimmedUsername !== user.userName;

            // Kullanıcı adı değişikliği sadece profil formu submitted olduğunda yapılsın
            if (usernameChanged && target === 'profile') {
                await userService.updateUsername(trimmedUsername);
            }

            await userService.updateDetails({
                id: user.id,
                name: updateData.name,
                surname: updateData.surname,
                email: updateData.email,
                cityCode: updateData.cityCode,
                genderCode: updateData.genderCode,
                customHierarchyId: updateData.customHierarchyId,
                mentionNotificationEnabled: updateData.mentionNotificationEnabled,
                isProfilePublic: updateData.isProfilePublic,
                showSolutions: updateData.showSolutions,
                showProblems: updateData.showProblems
            });
            setMessage({ type: 'success', text: 'Bilgileriniz başarıyla güncellendi! ✅' });
            loadUserAndConstants(); // Yeni verileri çek

            // 3 saniye sonra mesajı temizle
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            const msg = (err as any)?.response?.data?.message || (err as any)?.response?.data || 'Bilgiler güncellenemedi. ❌';
            setMessage({ type: 'error', text: typeof msg === 'string' ? msg : 'Bilgiler güncellenemedi. ❌' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage({ type: '', text: '' });

        const isGoogleNoPassword = user?.authType === 'Google' && !user?.hasPassword;

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
            const result = await authService.updatePassword({
                id: userId,
                oldPassword: isGoogleNoPassword ? '' : passForm.oldPassword,
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
                topicIds: editSelectedTopics,
                cityCode: editCityCode,
                address: editAddress.trim() ? editAddress.trim() : null,
                latitude: editLatitude,
                longitude: editLongitude,
                clearLocation: editClearLocation,
                customHierarchyId: editCustomHierarchyId,
                image: editImage
            };
            await problemService.update(updatedProblem);

            // Konum/şehir/resim de değişebileceği için yeniden çek
            await fetchProfileData();
            setEditingProblemId(null);
        } catch (err) { alert("Güncelleme başarısız oldu."); }
    };

    const handleEditGetMyLocation = () => {
        setEditLocationError('');

        if (!('geolocation' in navigator)) {
            setEditLocationError('Tarayıcınız konum özelliğini desteklemiyor.');
            return;
        }

        setEditIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setEditLatitude(pos.coords.latitude);
                setEditLongitude(pos.coords.longitude);
                setEditClearLocation(false);
                setEditIsLocating(false);
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setEditLocationError('Konum izni verilmedi. İsterseniz haritadan pin bırakabilirsiniz.');
                } else {
                    setEditLocationError('Konum alınamadı. İsterseniz haritadan pin bırakabilirsiniz.');
                }
                setEditIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const EditLocationClickHandler = () => {
        useMapEvents({
            click(e: LeafletMouseEvent) {
                setEditLatitude(e.latlng.lat);
                setEditLongitude(e.latlng.lng);
                setEditClearLocation(false);
                setEditLocationError('');
            }
        });
        return null;
    };

    const editMapCenter: LatLngExpression = editLatitude !== null && editLongitude !== null
        ? [editLatitude, editLongitude]
        : DEFAULT_CENTER;
    const editMapZoom = editLatitude !== null && editLongitude !== null ? 15 : 6;

    useEffect(() => {
        const resolve = async () => {
            if (editingProblemId === null) return;
            if (editClearLocation) {
                setEditAutoCityName(null);
                setEditIsResolvingCity(false);
                return;
            }
            if (editLatitude === null || editLongitude === null) {
                setEditAutoCityName(null);
                setEditIsResolvingCity(false);
                return;
            }

            setEditIsResolvingCity(true);
            try {
                const res = await constantService.reverseGeocodeCity(editLatitude, editLongitude);
                if (res.data.success) {
                    setEditCityCode(res.data.data.cityCode);
                    setEditAutoCityName(res.data.data.cityName);
                    const resolvedAddress = (res.data.data.resolvedAddress || '').trim();
                    if (!editAddress.trim() && resolvedAddress) {
                        setEditAddress(resolvedAddress.slice(0, 500));
                    }
                    setEditLocationError('');
                }
            } catch (err: any) {
                setEditAutoCityName(null);
                setEditLocationError(err?.response?.data?.message || 'Konumdan şehir tespit edilemedi. Lütfen pini şehir içinde olacak şekilde düzeltin.');
            } finally {
                setEditIsResolvingCity(false);
            }
        };

        resolve();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingProblemId, editLatitude, editLongitude, editClearLocation]);

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
                                {canChangeAvatar && (
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
                                )}
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
                                    <span className="w-24 font-bold text-gray-500 uppercase text-xs">{terminology.cityLabel}:</span>
                                    <span className="font-medium">
                                        {(() => {
                                            if (user && user.customHierarchyId != null && institution?.customHierarchyJson) {
                                                try {
                                                    const items = JSON.parse(institution.customHierarchyJson) as string[];
                                                    return items[user.customHierarchyId] || user.cityName;
                                                } catch { return user.cityName; }
                                            }
                                            return user?.cityName;
                                        })()}
                                    </span>
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
                                        E-Posta: {user?.emailNotificationPermission ? 'AÇIK' : 'KAPALI'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold shadow-sm ml-2 ${user?.mentionNotificationEnabled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                                        Etiket: {user?.mentionNotificationEnabled ? 'AÇIK' : 'KAPALI'}
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
                            className={`flex-1 min-w-[80px] sm:min-w-[120px] py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'problems' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Sorunlarım ({myProblems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('solutions')}
                            className={`flex-1 min-w-[80px] sm:min-w-[120px] py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'solutions' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Çözümlerim ({mySolutions.length})
                        </button>
                        {enableSavedSolutions && (
                            <button
                                onClick={() => setActiveTab('saved')}
                                className={`flex-1 min-w-[80px] sm:min-w-[120px] py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'saved' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                Kaydedilenler ({savedSolutions.length})
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 min-w-[80px] sm:min-w-[120px] py-4 text-sm font-bold tracking-wider uppercase px-4 transition-colors ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
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

                                                    {/* KONUM */}
                                                    {enableMapLocation && (
                                                        <div className="pt-2 border-t border-gray-200 mt-2">
                                                            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Konum</label>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleEditGetMyLocation}
                                                                        disabled={editIsLocating}
                                                                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                                    >
                                                                        {editIsLocating ? 'Konum alınıyor…' : 'Konumumu Al'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditClearLocation(true);
                                                                            setEditLatitude(null);
                                                                            setEditLongitude(null);
                                                                            setEditAddress('');
                                                                            setEditAutoCityName(null);
                                                                            setEditLocationError('');
                                                                        }}
                                                                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                                                                    >
                                                                        Konumu Temizle
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="text-[11px] font-bold text-gray-600 mb-2 pl-1">
                                                                {editClearLocation ? (
                                                                    <span>Konum kaldırılacak.</span>
                                                                ) : editIsResolvingCity ? (
                                                                    <span>Şehir tespit ediliyor…</span>
                                                                ) : editAutoCityName ? (
                                                                    <span>Şehir (otomatik): <span className="text-gray-900">{editAutoCityName}</span></span>
                                                                ) : (
                                                                    <span>Pin bırakır veya konum alırsanız şehir otomatik seçilir.</span>
                                                                )}
                                                            </div>

                                                            {/* ŞEHİR DROPDOWN (konum seçilirse kilitlenir) */}
                                                            {institution?.customHierarchyJson ? (
                                                                <select
                                                                    value={editCustomHierarchyId ?? ''}
                                                                    onChange={(e) => setEditCustomHierarchyId(e.target.value === '' ? null : Number(e.target.value))}
                                                                    className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-2.5 rounded-lg text-sm bg-white"
                                                                >
                                                                    <option value="">{terminology.cityLabel} Seçiniz</option>
                                                                    {(() => {
                                                                        try {
                                                                            const items = JSON.parse(institution.customHierarchyJson) as string[];
                                                                            return items.map((item, idx) => (
                                                                                <option key={idx} value={idx}>{item}</option>
                                                                            ));
                                                                        } catch { return null; }
                                                                    })()}
                                                                </select>
                                                            ) : (
                                                                <select
                                                                    value={editCityCode}
                                                                    onChange={(e) => {
                                                                        setEditCityCode(Number(e.target.value));
                                                                        setEditAutoCityName(null);
                                                                        setEditClearLocation(false);
                                                                    }}
                                                                    disabled={(!editClearLocation && editLatitude !== null && editLongitude !== null) || editIsResolvingCity}
                                                                    className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-2.5 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                                                >
                                                                    <option value={0}>Şehir seçin</option>
                                                                    {cities.map((c) => (
                                                                        <option key={c.value} value={c.value}>{c.text}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                            <div className="text-[11px] font-bold text-gray-500 mt-1 pl-1">
                                                                {(!editClearLocation && editLatitude !== null && editLongitude !== null)
                                                                    ? 'Konum seçili olduğu için şehir kilitlidir.'
                                                                    : 'Konum seçmezseniz şehir bilgisini buradan değiştirebilirsiniz.'}
                                                            </div>

                                                            {editLocationError && (
                                                                <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                                                                    {editLocationError}
                                                                </div>
                                                            )}

                                                            <input
                                                                type="text"
                                                                placeholder="Adres (opsiyonel)"
                                                                className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-2.5 rounded-lg text-sm bg-white"
                                                                value={editAddress}
                                                                onChange={e => {
                                                                    setEditAddress(e.target.value);
                                                                    setEditClearLocation(false);
                                                                }}
                                                            />

                                                            <div className="mt-3 h-52 w-full rounded-lg overflow-hidden border border-gray-200 bg-white">
                                                                <MapContainer
                                                                    center={editMapCenter}
                                                                    zoom={editMapZoom}
                                                                    scrollWheelZoom={false}
                                                                    className="h-full w-full"
                                                                >
                                                                    <TileLayer
                                                                        attribution='&copy; OpenStreetMap katkıda bulunanlar'
                                                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                                    />
                                                                    <EditLocationClickHandler />
                                                                    {!editClearLocation && editLatitude !== null && editLongitude !== null && (
                                                                        <Marker position={[editLatitude, editLongitude] as LatLngExpression} />
                                                                    )}
                                                                </MapContainer>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* RESİM */}
                                                    <div className="pt-2 border-t border-gray-200 mt-2">
                                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">Resim</label>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="w-full text-sm"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0] || null;
                                                                setEditImage(file);
                                                            }}
                                                        />
                                                        <div className="text-[11px] font-bold text-gray-500 mt-1 pl-1">
                                                            {editImage ? `Seçilen: ${editImage.name}` : 'Yeni bir resim seçmezseniz mevcut resim korunur.'}
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
                                                            {canUpdateOwnProblem && (
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingProblemId(prob.id);
                                                                        setEditProblemData({ title: prob.title, description: prob.description });
                                                                        setEditSelectedTopics(prob.topics ? prob.topics.map((t: any) => t.id) : []);

                                                                        setEditAddress(prob.address || '');
                                                                        setEditLatitude(prob.latitude ?? null);
                                                                        setEditLongitude(prob.longitude ?? null);
                                                                        setEditCityCode(prob.cityCode);
                                                                        setEditCustomHierarchyId(prob.customHierarchyId ?? null);
                                                                        setEditAutoCityName(null);
                                                                        setEditClearLocation(false);
                                                                        setEditImage(null);
                                                                        setEditLocationError('');
                                                                    }}
                                                                    className="px-4 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold hover:bg-yellow-100 transition shadow-sm active:scale-95"
                                                                >
                                                                    Düzenle
                                                                </button>
                                                            )}
                                                            {canDeleteOwnProblem && (
                                                                <button
                                                                    onClick={() => handleDeleteProblem(prob)}
                                                                    className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition shadow-sm active:scale-95"
                                                                >
                                                                    Sil
                                                                </button>
                                                            )}
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
                                                            {canUpdateOwnSolution && (
                                                                <button onClick={() => { setEditingSolutionId(sol.id); setEditSolutionData({ title: sol.title, description: sol.description }); }} className="px-4 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold hover:bg-yellow-100 transition shadow-sm active:scale-95">Düzenle</button>
                                                            )}
                                                            {canDeleteOwnSolution && (
                                                                <button onClick={() => handleDeleteSolution(sol)} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition shadow-sm active:scale-95">Sil</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* KAYDEDİLENLER SEKMESİ */}
                        {activeTab === 'saved' && enableSavedSolutions && (
                            <div className="space-y-4 animate-fade-in">
                                {savedSolutions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-4xl mb-3">💾</div>
                                        <p className="text-gray-500 font-medium">Henüz bir çözüm kaydetmediniz.</p>
                                    </div>
                                ) : (
                                    savedSolutions.map(sol => (
                                        <div key={sol.id} className="p-5 border border-gray-100 rounded-xl hover:shadow-md transition mb-4 bg-white shadow-sm">
                                            <div className="flex justify-between items-start mb-2 gap-4">
                                                <div>
                                                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">{sol.problemName}</div>
                                                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{sol.title}</h4>
                                                </div>
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md font-medium whitespace-nowrap border border-gray-200">{new Date(sol.sendDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-5 leading-relaxed">{sol.description}</p>
                                            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full overflow-hidden bg-gray-200">
                                                        {sol.senderImageUrl ? (
                                                            <img src={getProfileImageUrl(sol.senderImageUrl)} alt={sol.senderUsername} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400 bg-gray-100">{sol.senderUsername[0].toUpperCase()}</div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700">@{sol.senderUsername}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Link to={`/problem/${sol.problemId}?solution=${sol.id}`} className="px-4 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-bold hover:bg-blue-100 transition shadow-sm active:scale-95">İncele</Link>
                                                    <button 
                                                        onClick={async () => {
                                                            try {
                                                                await actionService.toggleSolutionSave(sol.id);
                                                                setSavedSolutions(prev => prev.filter(s => s.id !== sol.id));
                                                            } catch { alert("İşlem başarısız oldu."); }
                                                        }}
                                                        className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition shadow-sm active:scale-95"
                                                    >
                                                        Kaldır
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                                {/* Form 1: Profil Bilgileri */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                                    <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Bilgileri Güncelle</h2>
                                    <form onSubmit={(e) => handleUpdateDetails(e, 'profile')} className="space-y-4 flex-1">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Kullanıcı Adı</label>
                                            <input
                                                type="text"
                                                disabled={!useFeature<boolean>('Profile.AllowUsernameChange', true)}
                                                className={`w-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition ${!useFeature<boolean>('Profile.AllowUsernameChange', true) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                value={updateData.userName}
                                                onChange={e => setUpdateData({ ...updateData, userName: e.target.value })}
                                                required
                                            />
                                            <div className="text-[11px] text-gray-500 mt-1 pl-1">
                                                {!useFeature<boolean>('Profile.AllowUsernameChange', true) 
                                                    ? 'Kurumunuz kullanıcı adı değişikliğine izin vermemektedir.' 
                                                    : 'Kullanıcı adınızı 30 günde 1 kez değiştirebilirsiniz.'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Ad</label><input type="text" className="w-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={updateData.name} onChange={e => setUpdateData({ ...updateData, name: e.target.value })} required /></div>
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Soyad</label><input type="text" className="w-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={updateData.surname} onChange={e => setUpdateData({ ...updateData, surname: e.target.value })} required /></div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">E-Posta</label>
                                            <input type="email" className="w-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={updateData.email} onChange={e => setUpdateData({ ...updateData, email: e.target.value })} required />
                                            {user?.email && updateData.email !== user.email && (
                                                <div className="text-[11px] text-amber-700 mt-1 pl-1">
                                                    E-posta adresinizi değiştirirseniz yeniden doğrulama yapana kadar sistemden çıkış yapılırsınız.
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">{terminology.cityLabel}</label>
                                                <div className="h-[46px]">
                                                    {institution?.customHierarchyJson ? (
                                                        <select
                                                            className="w-full h-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none px-3 rounded-md bg-white transition cursor-pointer text-sm"
                                                            value={updateData.customHierarchyId ?? ''}
                                                            onChange={e => setUpdateData({ ...updateData, customHierarchyId: e.target.value === '' ? null : Number(e.target.value) })}
                                                        >
                                                            <option value="">{terminology.cityLabel} Seçiniz</option>
                                                            {(() => {
                                                                try {
                                                                    const items = JSON.parse(institution.customHierarchyJson) as string[];
                                                                    return items.map((item, idx) => (
                                                                        <option key={idx} value={idx}>{item}</option>
                                                                    ));
                                                                } catch { return null; }
                                                            })()}
                                                        </select>
                                                    ) : (
                                                        <SearchableSelect
                                                            options={cities.filter(c => c.value !== 0).map(c => ({ value: c.value, label: c.text }))}
                                                            value={updateData.cityCode}
                                                            onChange={(val) => setUpdateData({ ...updateData, cityCode: Number(val) })}
                                                            placeholder="Şehir Seçiniz"
                                                        />
                                                    )}
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

                                        <button type="submit" disabled={isUpdating || !canUpdateProfile} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/30 mt-6 disabled:bg-blue-400 active:scale-95 flex justify-center items-center gap-2">
                                            {isUpdating ? (
                                                <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Kaydediliyor...</>
                                            ) : 'Bilgileri Kaydet'}
                                        </button>
                                    </form>
                                </div>

                                {/* Form 2: Gizlilik ve Bildirimler */}
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Gizlilik ve Bildirimler</h2>
                                        <form onSubmit={(e) => handleUpdateDetails(e, 'preferences')} className="space-y-5">
                                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-800">Etiketleme Bildirimleri</h4>
                                                        <p className="text-[11px] text-gray-500">Bir içerikte etiketlendiğinizde anlık bildirim alırsınız.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer" 
                                                            checked={updateData.mentionNotificationEnabled}
                                                            onChange={e => setUpdateData({ ...updateData, mentionNotificationEnabled: e.target.checked })}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>

                                            {useFeature<boolean>('Profile.AllowPrivacySettings', true) && (
                                                <div className="space-y-4 pt-2">
                                                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
                                                        <div>
                                                            <h5 className="text-xs font-bold text-gray-700">Profil Görünürlüğü</h5>
                                                            <p className="text-[10px] text-gray-500">Profilinizin diğer kullanıcılar tarafından görülmesini sağlar.</p>
                                                        </div>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" className="sr-only peer" checked={updateData.isProfilePublic} onChange={e => setUpdateData({ ...updateData, isProfilePublic: e.target.checked })} />
                                                            <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
                                                        <div>
                                                            <h5 className="text-xs font-bold text-gray-700">Sorunlarımı Göster</h5>
                                                            <p className="text-[10px] text-gray-500">Paylaştığınız sorunların profilinizde listelenmesini sağlar.</p>
                                                        </div>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" className="sr-only peer" checked={updateData.showProblems} onChange={e => setUpdateData({ ...updateData, showProblems: e.target.checked })} />
                                                            <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
                                                        <div>
                                                            <h5 className="text-xs font-bold text-gray-700">Çözümlerimi Göster</h5>
                                                            <p className="text-[10px] text-gray-500">Paylaştığınız çözümlerin profilinizde listelenmesini sağlar.</p>
                                                        </div>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input type="checkbox" className="sr-only peer" checked={updateData.showSolutions} onChange={e => setUpdateData({ ...updateData, showSolutions: e.target.checked })} />
                                                            <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {prefMessage.text && (
                                                <div className={`p-3 rounded-xl text-sm font-bold mt-4 animate-fade-in-down ${prefMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                    {prefMessage.text}
                                                </div>
                                            )}

                                            <button type="submit" disabled={isUpdating || !canUpdateProfile} className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-black transition shadow-md mt-4 disabled:bg-gray-400 active:scale-95">
                                                {isUpdating ? 'Kaydediliyor...' : 'Tercihleri Güncelle'}
                                            </button>
                                        </form>
                                    </div>
                                    
                                    {/* Şifre Güncelleme */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
                                        <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">{user?.authType === 'Google' && !user?.hasPassword ? 'Şifre Belirle' : 'Şifre Değiştir'}</h2>
                                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                                            {!(user?.authType === 'Google' && !user?.hasPassword) && (
                                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Eski Şifreniz</label><input type="password" placeholder="Mevcut şifreniz" className="w-full border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={passForm.oldPassword} onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })} required /></div>
                                            )}
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Yeni Şifre</label><input type="password" placeholder="En az 6 karakter" minLength={6} className="w-full border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} required /></div>
                                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 pl-1">Yeni Şifre (Tekrar)</label><input type="password" placeholder="Yeni şifrenizi doğrulayın" minLength={6} className="w-full border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none p-3 rounded-xl bg-gray-50 transition" value={passForm.confirmPassword} onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })} required /></div>

                                            {passMessage.text && (
                                                <div className={`p-3 rounded-xl text-sm font-bold mt-4 animate-fade-in-down ${passMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                    {passMessage.text}
                                                </div>
                                            )}

                                            <button type="submit" disabled={isPassUpdating || !canChangePassword} className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-md mt-6 disabled:bg-gray-500 active:scale-95 flex justify-center items-center gap-2">
                                                {isPassUpdating ? (
                                                    <><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Güncelleniyor...</>
                                                ) : (user?.authType === 'Google' && !user?.hasPassword ? 'Şifre Belirle' : 'Şifreyi Güncelle')}
                                            </button>
                                        </form>
                                    </div>
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