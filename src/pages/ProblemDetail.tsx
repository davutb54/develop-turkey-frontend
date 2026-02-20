import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // URL'deki ID'yi almak için
import { problemService } from '../services/problemService';
import { solutionService, type SolutionAddDto } from '../services/solutionService';
import { userService } from '../services/userService';
import type { ProblemDetailDto, SolutionDetailDto, UserDetailDto } from '../types';
import Navbar from '../components/Navbar';
import { solutionVoteService } from '../services/solutionVoteService';
import CommentSection from '../components/CommentSection';
import ReportModal from '../components/ReportModal';

const ProblemDetail = () => {
    const { id } = useParams<{ id: string }>(); // URL'den ID'yi al
    const [problem, setProblem] = useState<ProblemDetailDto | null>(null);
    const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
    const [currentUser, setCurrentUser] = useState<UserDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    // Şikayet Modalı State'leri
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'Problem' | 'Solution', id: number } | null>(null);

    const openReportModal = (type: 'Problem' | 'Solution', id: number) => {
        setReportTarget({ type, id });
        setIsReportModalOpen(true);
    };

    // Çözüm Formu Verileri
    const [solutionForm, setSolutionForm] = useState({ title: '', description: '' });
    const [submitMessage, setSubmitMessage] = useState('');

    useEffect(() => {
        if (id) {
            loadData(parseInt(id));
            checkUser();
        }
    }, [id]);

    // Kullanıcı bilgisini token'dan çözümlemek yerine API'den çekebiliriz veya 
    // LocalStorage'a kaydettiğimiz basit bilgiyi kullanabiliriz.
    // Burada basitlik adına token varsa user servisine gidip "ben kimim" diye sormak en garantisidir.
    // Ama şimdilik token'ı decode etmekle uğraşmayıp, sadece "token var mı" diye bakacağız.
    // Gerçek uygulamada "Decode Token" işlemi yapılır.
    const checkUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            // Token'ın içinden ID'yi almak gerekir. 
            // Basitlik için: Kullanıcı giriş yaptığında ID'sini de localStorage'a atabiliriz.
            // EĞER localStorage'da userId yoksa bu kısım eksik kalır.
            // *ÖNEMLİ*: Login.tsx sayfasına gidip userId'yi de kaydetmemiz gerekebilir.
            // Şimdilik varsayılan bir ID ile test edemeyiz, o yüzden Login sayfasına küçük bir ekleme yapacağız.
            const storedUserId = localStorage.getItem('userId');
            if (storedUserId) {
                // Kullanıcı ID elimizde var
            }
        }
    };

    const loadData = async (problemId: number) => {
        try {
            // Paralel istek atarak hem sorunu hem çözümleri aynı anda çekelim
            const [problemRes, solutionRes] = await Promise.all([
                problemService.getById(problemId),
                solutionService.getByProblemId(problemId)
            ]);

            if (problemRes.data.success) setProblem(problemRes.data.data);
            if (solutionRes.data.success) setSolutions(solutionRes.data.data);

        } catch (err) {
            console.error("Veri yükleme hatası", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSolutionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const userId = localStorage.getItem('userId');

        if (!userId || !problem) {
            alert("Lütfen önce giriş yapın.");
            return;
        }

        const newSolution: SolutionAddDto = {
            senderId: parseInt(userId),
            problemId: problem.id,
            title: solutionForm.title,
            description: solutionForm.description
        };

        try {
            const result = await solutionService.add(newSolution);
            if (result.data.success) {
                setSubmitMessage("Çözümünüz başarıyla eklendi!");
                setSolutionForm({ title: '', description: '' });
                // Listeyi yenile
                loadData(problem.id);
            } else {
                setSubmitMessage("Hata: " + result.data.message);
            }
        } catch (err) {
            setSubmitMessage("Sunucu hatası oluştu.");
        }
    };

    const handleVote = async (solutionId: number, isUpvote: boolean) => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            alert("Oy vermek için giriş yapmalısınız.");
            return;
        }

        try {
            // Backend'e isteği at
            await solutionVoteService.vote(solutionId, parseInt(userId), isUpvote);

            // UI'ı anlık güncelle (Sayfayı yenilemeden sayıları değiştir)
            setSolutions(prevSolutions => prevSolutions.map(sol => {
                if (sol.id === solutionId) {
                    // Basit mantık: Eğer upvote bastıysa upvote sayısını artır
                    // Not: Gerçek senaryoda kullanıcının önceki oyunu bilmek gerekir ama
                    // şimdilik basitçe +1 / -1 yapalım görsel olarak.
                    // En garantisi işlemden sonra veriyi tekrar çekmektir:
                    return sol;
                }
                return sol;
            }));

            // Verileri tazelemek en temiz yöntemdir
            loadData(parseInt(id!));

        } catch (err) {
            console.error("Oy verme hatası", err);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    if (loading) return <div className="text-center p-10">Yükleniyor...</div>;
    if (!problem) return <div className="text-center p-10">Sorun bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

                {/* Üst Kısım: Sorun Kartı */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                    {problem.imageUrl && (
                        <div className="h-64 w-full bg-gray-200">
                            <img
                                src={`http://localhost:5214/uploads/problems/${problem.imageUrl}`}
                                alt={problem.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-2xl leading-6 font-bold text-gray-900">
                            {problem.title}
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            {problem.topicName} • {problem.cityName} • {formatDate(problem.sendDate)}
                        </p>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                        <p className="text-gray-700 text-lg whitespace-pre-wrap">
                            {problem.description}
                        </p>
                        <Link to={`/user/${problem.senderId}`} className="mt-4 flex items-center">
                            <div className="font-medium text-blue-600">Gönderen: {problem.senderUsername}</div>
                        </Link>
                        <button
                            onClick={() => openReportModal('Problem', problem.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 mt-3 transition bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100 w-fit"
                        >
                            🚩 Bu Sorunu Şikayet Et
                        </button>
                    </div>
                </div>

                {/* Alt Kısım: Çözümler */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sol Taraf: Çözüm Listesi */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Çözüm Önerileri ({solutions.length})</h2>

                        {solutions.length === 0 ? (
                            <p className="text-gray-500 bg-white p-4 rounded shadow">Henüz çözüm önerisi yok.</p>
                        ) : (
                            <div className="space-y-4">
                                {solutions.map(sol => (
                                    <div key={sol.id} className={`bg-white p-6 rounded-lg shadow border-l-4 ${sol.senderIsExpert ? 'border-green-500' : 'border-blue-500'} transition-all hover:shadow-md`}>
                                        <div className='flex'>
                                            {/* OYLAMA KISMI (SOL TARAFTA) */}
                                            <div className="flex flex-col items-center justify-start mr-4 space-y-1">
                                                <button
                                                    onClick={() => handleVote(sol.id, true)}
                                                    className="text-gray-400 hover:text-orange-500 transition p-1"
                                                    title="Bu çözüm yararlı"
                                                >
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                </button>

                                                <span className="text-xl font-bold text-gray-700">
                                                    {/* Backend'den gelen VoteCount alanı varsa onu kullan, yoksa 0 */}
                                                    {(sol as any).voteCount || 0}
                                                </span>

                                                <button
                                                    onClick={() => handleVote(sol.id, false)}
                                                    className="text-gray-400 hover:text-blue-500 transition p-1"
                                                    title="Bu çözüm yararlı değil"
                                                >
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                            </div>

                                            {/* İÇERİK KISMI */}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-lg font-bold text-gray-900">{sol.title}</h4>
                                                    <span className="text-xs text-gray-500">{formatDate(sol.sendDate)}</span>
                                                </div>
                                                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{sol.description}</p>

                                                <div className="mt-4 flex items-center justify-between text-sm">
                                                    <div className="flex items-center">
                                                        <Link to={`/user/${sol.senderId}`} className="font-bold text-gray-900 mr-2">{sol.senderUsername}</Link>
                                                        {sol.senderIsExpert && (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                Uzman
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6">
                                            <CommentSection solutionId={sol.id} />
                                        </div>
                                        <button
                                            onClick={() => openReportModal('Solution', sol.id)}
                                            className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 px-2 py-1 rounded-md font-bold uppercase tracking-wider transition ml-auto"
                                        >
                                            🚩 Şikayet Et
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sağ Taraf: Çözüm Ekleme Formu */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-lg shadow sticky top-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Çözümün var mı?</h3>

                            {localStorage.getItem('token') ? (
                                <form onSubmit={handleSolutionSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700">Başlık</label>
                                        <input
                                            type="text"
                                            required
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={solutionForm.title}
                                            onChange={(e) => setSolutionForm({ ...solutionForm, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                        <textarea
                                            required
                                            rows={4}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            value={solutionForm.description}
                                            onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
                                        />
                                    </div>

                                    {submitMessage && (
                                        <div className={`mb-4 text-sm ${submitMessage.includes('Hata') ? 'text-red-600' : 'text-green-600'}`}>
                                            {submitMessage}
                                        </div>
                                    )}

                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition">
                                        Gönder
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-gray-600 mb-4">Çözüm yazmak için giriş yapmalısın.</p>
                                    <Link to="/login" className="text-blue-600 font-medium hover:underline">
                                        Giriş Yap
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </main>

            {/* Şikayet Modalı */}
            {reportTarget && (
                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                />
            )}
        </div>
    );
};

export default ProblemDetail;