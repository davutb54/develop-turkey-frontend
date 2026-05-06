import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { userService } from '../services/userService';
import { problemService } from '../services/problemService';
import { solutionService } from '../services/solutionService';
import type { UserPublicProfileDto, ProblemDetailDto, SolutionDetailDto } from '../types';
import Navbar from '../components/Navbar';
import ReportModal from '../components/ReportModal';
import { getProfileImageUrl } from '../utils/imageUtils';

const UserProfile = () => {
    const { id } = useParams<{ id: string }>(); // URL'den tıklanan kişinin ID'sini alıyoruz
    const [user, setUser] = useState<UserPublicProfileDto | null>(null);
    const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
    const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
    const [activeTab, setActiveTab] = useState<'problems' | 'solutions'>('problems');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!id) return;
            setLoading(true);

            try {
                const userId = parseInt(id);
                // Kullanıcının bilgilerini, sorunlarını ve çözümlerini aynı anda çekiyoruz
                const [userRes, probRes, solRes] = await Promise.all([
                    userService.getPublicProfile(userId),
                    problemService.getBySender(userId),
                    solutionService.getBySender(userId)
                ]);

                if (userRes.data.success) {
                    setUser(userRes.data.data);
                } else {
                    setError(userRes.data.message || "Kullanıcı bulunamadı.");
                }

                if (probRes.data.success) setProblems(probRes.data.data);
                if (solRes.data.success) setSolutions(solRes.data.data);

            } catch (err) {
                setError("Bilgiler yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [id]);

    if (loading) return <div className="text-center p-20 font-medium text-blue-600">Kullanıcı Yükleniyor...</div>;
    if (error || !user) return <div className="text-center p-20 text-red-500 font-bold">{error || "Kullanıcı bulunamadı"}</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />
            <div className="max-w-5xl mx-auto py-12 px-4">

                {/* Kullanıcı Bilgi Kartı */}
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden mb-8 border border-gray-100">
                    <div className="h-32 bg-gradient-to-r from-gray-600 to-gray-800"></div>

                    <div className="relative px-6 pb-8">
                        {/* Profil Resmi (Salt Okunur - Değiştirme butonu yok) */}
                        <div className="absolute -top-16 left-6">
                            <div className="h-32 w-32 rounded-full border-4 border-white overflow-hidden bg-gray-200 shadow-lg">
                                {user.profileImageUrl ? (
                                    <img
                                        src={getProfileImageUrl(user.profileImageUrl)}
                                        alt="Profil"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-4xl font-bold bg-gray-100">
                                        {user.name[0]}{user.surname[0]}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-20">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h1 className="text-3xl font-extrabold text-gray-900">{user.name} {user.surname}</h1>
                                    <p className="text-gray-500 font-medium">@{user.userName}</p>
                                </div>
                                <div className="flex gap-2">
                                    {user.isAdmin && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">Yönetici</span>}
                                    {user.isExpert && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Uzman</span>}
                                    {user.isOfficial && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">Resmi Makam</span>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-8 border-t border-gray-100 pt-6 text-sm">
                            <div className="flex items-center text-gray-700">
                                <span className="font-bold text-gray-500 uppercase text-xs mr-2">Şehir:</span>
                                <span className="font-medium">{user.cityName}</span>
                            </div>
                            <div className="flex items-center text-gray-700">
                                <span className="font-bold text-gray-500 uppercase text-xs mr-2">Kayıt:</span>
                                <span className="font-medium">{new Date(user.registerDate).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <button
                                onClick={() => setIsReportModalOpen(true)}
                                className="ml-4 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1"
                            >
                                🚩 Profili Şikayet Et
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sekmeler (Sadece Sorunlar ve Çözümler var, Ayarlar yok) */}
                <div className="bg-white shadow-md rounded-xl overflow-hidden">
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('problems')}
                            className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'problems' ? 'text-gray-800 border-b-2 border-gray-800' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Kullanıcının Sorunları ({problems.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('solutions')}
                            className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'solutions' ? 'text-gray-800 border-b-2 border-gray-800' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            Kullanıcının Çözümleri ({solutions.length})
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'problems' ? (
                            <div className="space-y-4">
                                {problems.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10">Kullanıcı henüz bir sorun paylaşmamış.</p>
                                ) : (
                                    problems.map(prob => (
                                        <div key={prob.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{prob.title}</h4>
                                                <p className="text-xs text-gray-500">{prob.cityName} • {new Date(prob.sendDate).toLocaleDateString('tr-TR')}</p>
                                            </div>
                                            <Link to={`/problem/${prob.id}`} className="text-blue-600 text-sm font-bold hover:underline">İncele</Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {solutions.length === 0 ? (
                                    <p className="text-center text-gray-500 py-10">Kullanıcı henüz bir çözüm önerisinde bulunmamış.</p>
                                ) : (
                                    solutions.map(sol => (
                                        <div key={sol.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                                            <div className="flex justify-between mb-2">
                                                <h4 className="font-bold text-gray-900">{sol.title}</h4>
                                                <span className="text-xs text-gray-500">{new Date(sol.sendDate).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{sol.description}</p>
                                            <Link to={`/problem/${sol.problemId}`} className="text-xs text-blue-600 font-bold hover:underline italic">
                                                İlgili Soruna Git: {sol.problemName}
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
            {/* Şikayet Modalı */}
            {user && (
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    targetType="User"
                    targetId={user.id}
                />
            )}
        </div>
    );
};

export default UserProfile;