import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { problemService } from '../../../services/problemService';
import { getProfileImageUrl } from '../../../utils/imageUtils';
import { useCapability } from '../../../hooks/useCapability';

export default function ExpertApprovalsTab() {
    const canApprove = useCapability('expert.solution_approve');
    const canReject  = useCapability('expert.solution_reject');
    const [pendingSolutions, setPendingSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const res = await adminService.getPendingExpertSolutions();
            if (res.data.success) setPendingSolutions(res.data.data);
        } catch (err) { console.error('Bekleyen onaylar yüklenemedi', err); }
        finally { setLoading(false); }
    };

    const groupedPendingSolutions = Object.values(pendingSolutions.reduce((acc: any, sol) => {
        if (!acc[sol.problemId]) acc[sol.problemId] = { problemId: sol.problemId, problemName: sol.problemName, solutions: [] };
        acc[sol.problemId].solutions.push(sol);
        return acc;
    }, {})) as any[];

    const handleApproveSolution = async (sol: any) => {
        try {
            await adminService.approveSolution(sol.id);
            const probRes = await problemService.getById(sol.problemId);
            if (probRes.data.success) {
                const problemData = probRes.data.data;
                if (!problemData.isResolvedByExpert && !problemData.isResolved) {
                    await adminService.toggleProblemResolved(sol.problemId);
                }
            }
            alert('Çözüm onaylandı!');
            load();
        } catch { alert('Onay işlemi başarısız.'); }
    };

    const handleRejectSolution = async (id: number) => {
        if (!window.confirm('Bu uzman çözümünü reddetmek istediğinize emin misiniz?')) return;
        try { await adminService.rejectSolution(id); alert('Çözüm Reddedildi.'); load(); }
        catch { alert('Hata'); }
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Uzman Onayları</h1>
                <p className="text-slate-500 text-sm mt-1">Uzmanlar tarafından gönderilmiş, onay bekleyen çözümler.</p>
            </div>

            <div className="space-y-6">
                {groupedPendingSolutions.length === 0 ? (
                    <div className="bg-slate-50 p-12 rounded-3xl text-center border border-slate-100 shadow-inner">
                        <div className="text-6xl mb-4 drop-shadow-sm">🎉</div>
                        <h3 className="text-xl font-black text-slate-700">Her şey tertemiz!</h3>
                        <p className="text-slate-500 mt-2 font-medium">Şu an onay bekleyen hiçbir uzman çözümü yok.</p>
                    </div>
                ) : (
                    groupedPendingSolutions.map((group: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">İlgili Sorun</span>
                                    <Link to={`/problem/${group.problemId}`} target="_blank" className="font-black text-slate-800 text-lg hover:text-indigo-600 transition">
                                        {group.problemName}
                                    </Link>
                                </div>
                                <Link to={`/problem/${group.problemId}`} target="_blank" className="shrink-0 text-[11px] uppercase tracking-wider bg-white border border-slate-200 px-4 py-2 rounded-xl font-black text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition shadow-sm">
                                    Soruna Git ↗
                                </Link>
                            </div>
                            <div className="p-6 space-y-4 bg-white">
                                {group.solutions.map((sol: any) => (
                                    <div key={sol.id} className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-2xl relative shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <Link to={`/user/${sol.senderId}`} target="_blank" className="h-10 w-10 rounded-full bg-indigo-200 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0 overflow-hidden ring-2 ring-white hover:ring-indigo-300 transition">
                                                    {sol.senderImageUrl ? <img src={getProfileImageUrl(sol.senderImageUrl)} className="w-full h-full object-cover" alt={sol.senderUsername} /> : sol.senderUsername[0].toUpperCase()}
                                                </Link>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uzman</span>
                                                        <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">Onay Bekliyor</span>
                                                    </div>
                                                    <Link to={`/user/${sol.senderId}`} target="_blank" className="font-bold text-indigo-900 text-sm hover:underline">@{sol.senderUsername}</Link>
                                                </div>
                                            </div>
                                            <span className="text-xs text-slate-400 font-bold bg-white px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">{new Date(sol.sendDate).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-slate-700 text-sm leading-relaxed mb-5 bg-white p-4 rounded-xl border border-indigo-50 shadow-sm">{sol.description}</p>
                                        <div className="flex gap-3 pt-4 border-t border-indigo-100/50">
                                            {canApprove && (
                                            <button onClick={() => handleApproveSolution(sol)} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:from-emerald-600 hover:to-green-700 transition shadow-md shadow-emerald-500/20 active:scale-95">
                                                Onayla &amp; Çözüldü Yap
                                            </button>
                                            )}
                                            {canReject && (
                                            <button onClick={() => handleRejectSolution(sol.id)} className="px-6 py-2.5 bg-white border border-rose-200 text-rose-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-50 transition shadow-sm active:scale-95">
                                                Reddet
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
