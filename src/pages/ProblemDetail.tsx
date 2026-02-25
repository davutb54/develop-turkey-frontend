import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { problemService } from '../services/problemService';
import { solutionService, type SolutionAddDto } from '../services/solutionService';
import { solutionVoteService } from '../services/solutionVoteService';
import type { ProblemDetailDto, SolutionDetailDto } from '../types';
import Navbar from '../components/Navbar';
import CommentSection from '../components/CommentSection';
import ReportModal from '../components/ReportModal';

const ProblemDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [problem, setProblem] = useState<ProblemDetailDto | null>(null);
    const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
    const [loading, setLoading] = useState(true);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'Problem' | 'Solution', id: number } | null>(null);

    const [solutionForm, setSolutionForm] = useState({ title: '', description: '' });
    const [submitMessage, setSubmitMessage] = useState({ text: '', type: '' });

    const currentUserId = parseInt(localStorage.getItem('userId') || '0');

    useEffect(() => {
        if (id) {
            loadData(parseInt(id));
        }
    }, [id]);

    const loadData = async (problemId: number) => {
        try {
            const [problemRes, solutionRes] = await Promise.all([
                problemService.getById(problemId),
                solutionService.getByProblemId(problemId)
            ]);

            if (problemRes.data.success) {
                setProblem(problemRes.data.data);
            }
            if (solutionRes.data.success) {
                const activeSolutions = solutionRes.data.data.filter((s: any) => !s.isDeleted);
                setSolutions(activeSolutions);
            }
        } catch (err) {
            console.error("Veri yükleme hatası", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSolutionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserId || !problem) {
            alert("Lütfen önce giriş yapın.");
            return;
        }

        const newSolution: SolutionAddDto = {
            senderId: currentUserId,
            problemId: problem.id,
            title: solutionForm.title,
            description: solutionForm.description
        };

        try {
            const result = await solutionService.add(newSolution);
            if (result.data.success) {
                setSubmitMessage({ text: "Çözümünüz başarıyla eklendi!", type: 'success' });
                setSolutionForm({ title: '', description: '' });
                loadData(problem.id);
            } else {
                setSubmitMessage({ text: "Hata: " + result.data.message, type: 'error' });
            }
        } catch (err) {
            setSubmitMessage({ text: "Sunucu hatası oluştu.", type: 'error' });
        }
    };

    const handleVote = async (solutionId: number, isUpvote: boolean) => {
        if (!currentUserId) {
            alert("Oy vermek için giriş yapmalısınız.");
            return;
        }
        try {
            await solutionVoteService.vote(solutionId, currentUserId, isUpvote);
            loadData(parseInt(id!));
        } catch (err) {
            console.error("Oy verme hatası", err);
        }
    };

    const handleDeleteProblem = async () => {
        if (!window.confirm("Bu sorunu tamamen silmek istediğinize emin misiniz?")) return;
        try {
            await problemService.delete(problem!.id);
            alert("Sorun başarıyla silindi.");
            navigate('/');
        } catch (err) { alert("Sorun silinemedi."); }
    };

    const handleDeleteSolution = async (solutionId: number) => {
        if (!window.confirm("Çözümünüzü silmek istediğinize emin misiniz?")) return;
        try {
            await solutionService.delete(solutionId);
            alert("Çözüm silindi.");
            loadData(problem!.id);
        } catch (err) { alert("Çözüm silinemedi."); }
    };

    const openReportModal = (type: 'Problem' | 'Solution', targetId: number) => {
        setReportTarget({ type, id: targetId });
        setIsReportModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-blue-600">Yükleniyor...</div>;
    if (!problem) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">Sorun bulunamadı veya silinmiş.</div>;

    // YENİ EKLENEN AKILLI KONTROL: Çözümler içinde statüsü 1 (Onaylı) olan var mı?
    const isProblemResolved = solutions.some((sol: any) => sol.expertApprovalStatus === 1);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* ÜST KISIM: SORUN KARTI */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden mb-8 relative">

                    {/* Uzman Tarafından Çözüldüyse Üstte İnce Bir Yeşil Çizgi Göster */}
                    {isProblemResolved && (
                        <div className="h-2 w-full bg-green-500"></div>
                    )}

                    {problem.imageUrl && (
                        <div className="h-80 w-full bg-gray-100">
                            <img src={`/uploads/problems/${problem.imageUrl}`} alt={problem.title} className="w-full h-full object-cover" />
                        </div>
                    )}

                    <div className="p-8">
                        {/* Başlık ve Rozetler */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg">{problem.topicName}</span>
                            <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg">{problem.cityName}</span>

                            {/* Sorun çözüldüyse Rozeti Göster */}
                            {isProblemResolved && (
                                <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Çözüldü
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl font-black text-gray-900 mb-4">{problem.title}</h1>
                        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap mb-8">{problem.description}</p>

                        {/* Alt Bilgi & Aksiyonlar */}
                        <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-6">
                            <div className="flex items-center gap-3">
                                <Link to={`/user/${problem.senderId}`} className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center shadow-inner shrink-0 border border-gray-100">
                                    {problem.senderImageUrl ? (
                                        <img src={`/uploads/profiles/${problem.senderImageUrl}`} alt={problem.senderUsername} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-black text-blue-800">{problem.senderUsername[0].toUpperCase()}</span>
                                    )}
                                </Link>
                                <div>
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Gönderen</div>
                                    <Link to={`/user/${problem.senderId}`} className="font-bold text-gray-900 text-sm hover:text-blue-600 hover:underline">@{problem.senderUsername}</Link>
                                </div>
                                <div className="ml-4 pl-4 border-l border-gray-200">
                                    <div className="text-xs text-gray-400 font-medium">{formatDate(problem.sendDate)}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                {currentUserId === problem.senderId && (
                                    <button onClick={handleDeleteProblem} className="text-xs font-bold text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200 px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Sorunumu Sil
                                    </button>
                                )}
                                {currentUserId !== problem.senderId && currentUserId !== 0 && (
                                    <button onClick={() => openReportModal('Problem', problem.id)} className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-100 px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                                        🚩 Şikayet Et
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ALT KISIM: ÇÖZÜMLER VE FORM */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Sol Taraf: Çözüm Listesi */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Çözümler <span className="text-gray-400 text-lg">({solutions.length})</span></h2>
                        </div>

                        {solutions.length === 0 ? (
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center shadow-sm">
                                <div className="text-4xl mb-3">💬</div>
                                <h3 className="text-lg font-bold text-gray-800">İlk çözen sen ol!</h3>
                                <p className="text-gray-500 text-sm">Bu sorunun henüz bir çözümü yok. Eğer fikrin varsa hemen yandaki formdan paylaşabilirsin.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {[...solutions]
                                    .sort((a: any, b: any) => {
                                        // 1. Kural: Uzman çözümleri (Onaylı) en üste
                                        if (a.senderIsExpert && a.expertApprovalStatus === 1) return -1;
                                        if (b.senderIsExpert && b.expertApprovalStatus === 1) return 1;
                                        // 2. Kural: Uzman çözümleri (Bekleyenler) ikinci sıraya
                                        if (a.senderIsExpert && a.expertApprovalStatus === 0) return -1;
                                        if (b.senderIsExpert && b.expertApprovalStatus === 0) return 1;
                                        // 3. Kural: En çok oy alanlar (voteCount) sıralansın
                                        const voteA = a.voteCount || 0;
                                        const voteB = b.voteCount || 0;
                                        return voteB - voteA;
                                    })
                                    .map((sol: any) => {

                                        const isExpert = sol.senderIsExpert;
                                        const status = sol.expertApprovalStatus; // 0: Bekliyor, 1: Onaylı, 2: Red

                                        let borderColor = "border-blue-100";
                                        let badge = null;
                                        let bgColor = "bg-white";

                                        if (isExpert) {
                                            if (status === 1) {
                                                borderColor = "border-green-400 ring-4 ring-green-50";
                                                bgColor = "bg-green-50/20";
                                                badge = <span className="bg-green-500 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Uzman Tarafından Onaylandı</span>;
                                            } else if (status === 2) {
                                                borderColor = "border-red-200";
                                                bgColor = "bg-red-50/20";
                                                badge = <span className="bg-red-500 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Uzman Çözümü Reddedildi</span>;
                                            } else {
                                                borderColor = "border-yellow-400";
                                                badge = <span className="bg-yellow-500 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Uzman Çözümü (Onay Bekliyor)</span>;
                                            }
                                        }

                                        return (
                                            <div key={sol.id} className={`${bgColor} p-6 rounded-3xl shadow-sm border-l-4 border-y border-r ${borderColor} transition-all relative overflow-hidden`}>

                                                {/* SAĞ ÜST ROZET */}
                                                <div className="absolute top-5 right-5 z-10">
                                                    {badge}
                                                </div>

                                                <div className='flex mt-2'>
                                                    {/* OYLAMA KISMI (SOL TARAFTA) */}
                                                    <div className="flex flex-col items-center justify-start mr-5 space-y-1 bg-gray-50 p-2 rounded-2xl h-fit border border-gray-100">
                                                        <button onClick={() => handleVote(sol.id, true)} className="text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition p-1.5">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                                        </button>
                                                        <span className="text-lg font-black text-gray-800 py-1">{sol.voteCount || 0}</span>
                                                        <button onClick={() => handleVote(sol.id, false)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition p-1.5">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                    </div>

                                                    {/* İÇERİK KISMI */}
                                                    <div className="flex-1 pr-0 md:pr-12">
                                                        <h4 className="text-xl font-bold text-gray-900 mb-3">{sol.title}</h4>
                                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{sol.description}</p>

                                                        <div className="mt-5 flex items-center gap-3">
                                                            <Link to={`/user/${sol.senderId}`} className="h-10 w-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                                                                {sol.senderImageUrl ? (
                                                                    <img src={`/uploads/profiles/${sol.senderImageUrl}`} alt={sol.senderUsername} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-sm font-black text-blue-800">{sol.senderUsername[0].toUpperCase()}</span>
                                                                )}
                                                            </Link>
                                                            <div>
                                                                <Link to={`/user/${sol.senderId}`} className="font-bold text-gray-900 text-sm hover:underline">@{sol.senderUsername}</Link>
                                                                <div className="text-[11px] text-gray-500">{formatDate(sol.sendDate)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-6">
                                                    <CommentSection solutionId={sol.id} />
                                                </div>

                                                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100/60 gap-2">
                                                    {currentUserId === sol.senderId && (
                                                        <button onClick={() => handleDeleteSolution(sol.id)} className="text-[10px] text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition">
                                                            🗑️ Çözümü Sil
                                                        </button>
                                                    )}
                                                    {currentUserId !== sol.senderId && currentUserId !== 0 && (
                                                        <button onClick={() => openReportModal('Solution', sol.id)} className="text-[10px] text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition">
                                                            🚩 Şikayet Et
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </div>

                    {/* Sağ Taraf: Çözüm Ekleme Formu */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
                            <h3 className="text-xl font-black text-gray-900 mb-2">Çözümün var mı?</h3>
                            <p className="text-sm text-gray-500 mb-6">Diğer kullanıcılara yardımcı olmak için fikrini veya tecrübeni paylaş.</p>

                            {currentUserId !== 0 ? (
                                <form onSubmit={handleSolutionSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Çözüm Başlığı</label>
                                        <input
                                            type="text" required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            placeholder="Örn: Bu adımları izleyerek çözdüm"
                                            value={solutionForm.title}
                                            onChange={(e) => setSolutionForm({ ...solutionForm, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Detaylı Açıklama</label>
                                        <textarea
                                            required rows={5}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                                            placeholder="Ayrıntılarıyla anlat..."
                                            value={solutionForm.description}
                                            onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
                                        />
                                    </div>

                                    {submitMessage.text && (
                                        <div className={`mb-4 text-sm font-bold p-3 rounded-xl ${submitMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {submitMessage.text}
                                        </div>
                                    )}

                                    <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg shadow-gray-200 active:scale-95">
                                        Çözümü Gönder
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-gray-600 text-sm font-medium mb-4">Çözüm yazmak için giriş yapmalısın.</p>
                                    <Link to="/login" className="inline-block bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition">
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