import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { institutionService } from '../../../services/institutionService';
import type { ProblemDetailDto, Institution, Topic } from '../../../types';
import { useCapability } from '../../../hooks/useCapability';

const ITEMS_PER_PAGE = 8;

export default function ProblemsTab() {
    const canResolve   = useCapability('moderation.problem_resolve');
    const canHighlight = useCapability('moderation.problem_highlight');
    const canDelete    = useCapability('moderation.problem_delete');
    const canModerate  = useCapability('moderation.problem_moderate');
    const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [problemSearch, setProblemSearch] = useState('');
    const [problemStatus, setProblemStatus] = useState('');
    const [problemInst, setProblemInst] = useState('');
    const [problemTopicFilter, setProblemTopicFilter] = useState('');
    const [problemPage, setProblemPage] = useState(1);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [probRes, instRes, topicsRes] = await Promise.all([
                    adminService.getAllProblems(),
                    institutionService.getAll(),
                    adminService.getAllTopics(),
                ]);
                if (probRes.data.success) setProblems(probRes.data.data);
                if (instRes.data.success) setInstitutions(instRes.data.data);
                if (topicsRes.data.success) setTopics(topicsRes.data.data);
            } catch (err) { console.error('Sorunlar yüklenemedi', err); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const reload = async () => {
        try {
            const [probRes, instRes, topicsRes] = await Promise.all([
                adminService.getAllProblems(),
                institutionService.getAll(),
                adminService.getAllTopics(),
            ]);
            if (probRes.data.success) setProblems(probRes.data.data);
            if (instRes.data.success) setInstitutions(instRes.data.data);
            if (topicsRes.data.success) setTopics(topicsRes.data.data);
        } catch (err) { console.error('Yenileme başarısız', err); }
    };

    const filteredProblems = problems.filter(p => {
        const matchSearch = p.title.toLowerCase().includes(problemSearch.toLowerCase()) || p.senderUsername.toLowerCase().includes(problemSearch.toLowerCase());
        let matchStatus = true;
        if (problemStatus === 'highlighted') matchStatus = p.isHighlighted;
        if (problemStatus === 'resolved') matchStatus = p.isResolved || p.isResolvedByExpert;
        const matchInst = problemInst === '' || p.institutionId?.toString() === problemInst;
        let matchTopic = true;
        if (problemTopicFilter !== '') {
            matchTopic = p.topics && p.topics.some((t: any) => t.id.toString() === problemTopicFilter);
        }
        return matchSearch && matchStatus && matchInst && matchTopic;
    });

    const paginatedProblems = filteredProblems.slice((problemPage - 1) * ITEMS_PER_PAGE, problemPage * ITEMS_PER_PAGE);

    const handleDeleteProblem = async (id: number) => {
        if (!window.confirm('Bu sorunu silmek istediğinize emin misiniz?')) return;
        try { await adminService.deleteProblem(id); reload(); } catch { alert('Silinemedi.'); }
    };

    const handleToggleHighlight = async (id: number) => {
        try { await adminService.toggleProblemHighlight(id); reload(); }
        catch { alert('Öne çıkarma işlemi başarısız.'); }
    };

    const handleToggleProblemResolved = async (id: number) => {
        try { await adminService.toggleProblemResolved(id); reload(); }
        catch { alert('Çözüldü durumu güncellenemedi.'); }
    };

    const handleRemoveTopicFromProblem = async (problemId: number, topicId: number, topicName: string) => {
        if (!window.confirm(`'${topicName}' etiketini bu sorundan tamamen kaldırmak istediğinize emin misiniz?`)) return;
        try {
            await adminService.removeTopicFromProblem(problemId, topicId);
            setProblems(prev => prev.map(p => {
                if (p.id === problemId && p.topics) {
                    return { ...p, topics: p.topics.filter((t: any) => t.id !== topicId) };
                }
                return p;
            }));
        } catch { alert('Etiket silinemedi.'); }
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 animate-fade-in flex flex-col h-full">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Sorunlar</h1>
                <p className="text-slate-500 text-sm mt-1">Tüm kullanıcı sorunlarını yönetin.</p>
            </div>

            <div className="flex flex-wrap gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <input type="text" placeholder="Sorun başlığı veya yazar ara..." className="flex-1 min-w-[140px] sm:min-w-[200px] border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" value={problemSearch} onChange={e => { setProblemSearch(e.target.value); setProblemPage(1); }} />
                <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={problemInst} onChange={e => { setProblemInst(e.target.value); setProblemPage(1); }}>
                    <option value="">Tüm Kurumlar</option>
                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={problemTopicFilter} onChange={e => { setProblemTopicFilter(e.target.value); setProblemPage(1); }}>
                    <option value="">Tüm Kategoriler</option>
                    {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={problemStatus} onChange={e => { setProblemStatus(e.target.value); setProblemPage(1); }}>
                    <option value="">Aktif Sorunlar</option>
                    <option value="resolved">Sadece Çözülenler</option>
                    <option value="highlighted">Sadece Vitrindekiler</option>
                </select>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm flex-1 max-h-[600px] overflow-y-auto bg-slate-50/50">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Sorun Bilgisi</th>
                            <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Kategoriler (Etiketler)</th>
                            <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Durum</th>
                            <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {paginatedProblems.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500 font-medium">Sorun bulunamadı.</td></tr>
                        ) : paginatedProblems.map(prob => (
                            <tr key={prob.id} className="hover:bg-indigo-50/30 transition">
                                <td className="px-6 py-4">
                                    <Link to={`/problem/${prob.id}`} target="_blank" className="font-bold text-slate-800 text-sm hover:text-indigo-600 line-clamp-2 transition mb-1">{prob.title}</Link>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 font-medium">{new Date(prob.sendDate).toLocaleDateString('tr-TR')}</span>
                                        <span className="text-slate-300">•</span>
                                        <Link to={`/user/${prob.senderId}`} target="_blank" className="text-indigo-600 font-bold text-xs hover:underline">@{prob.senderUsername}</Link>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                        {prob.topics && prob.topics.length > 0 ? (
                                            prob.topics.map((t: any) => (
                                                <div key={t.id} className="flex items-center bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md shadow-sm overflow-hidden group">
                                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{t.name}</span>
                                                    {canModerate && <button
                                                        onClick={() => handleRemoveTopicFromProblem(prob.id, t.id, t.name)}
                                                        title="Bu etiketi sorundan kaldır"
                                                        className="px-1.5 bg-indigo-100 hover:bg-red-500 hover:text-white text-indigo-400 transition-colors h-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Kategori Yok</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 flex gap-1.5 flex-wrap">
                                    {prob.isHighlighted && <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">VİTRİN</span>}
                                    {prob.isResolved && <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">ÇÖZÜLDÜ (ADMİN)</span>}
                                    {prob.isResolvedByExpert && <span className="bg-teal-100 text-teal-700 border border-teal-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">UZMAN ÇÖZÜMÜ</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {canResolve && <button onClick={() => handleToggleProblemResolved(prob.id)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${prob.isResolved ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>
                                            {prob.isResolved ? 'Çözüldü İptal' : 'Çözüldü Yap'}
                                        </button>}
                                        {canHighlight && <button onClick={() => handleToggleHighlight(prob.id)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${prob.isHighlighted ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}>
                                            {prob.isHighlighted ? 'Vitrinden Al' : 'Vitrine Koy'}
                                        </button>}
                                        {canDelete && <button onClick={() => handleDeleteProblem(prob.id)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 transition shadow-sm">Sil</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center mt-4 px-2">
                <button onClick={() => setProblemPage(p => Math.max(1, p - 1))} disabled={problemPage === 1} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Önceki</button>
                <span className="text-sm font-bold text-slate-600">
                    Sayfa {problemPage} / {Math.ceil(filteredProblems.length / ITEMS_PER_PAGE) || 1}
                    <span className="ml-2 text-slate-400 font-normal">({filteredProblems.length} sorun)</span>
                </span>
                <button onClick={() => setProblemPage(p => p + 1)} disabled={problemPage >= Math.ceil(filteredProblems.length / ITEMS_PER_PAGE)} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Sonraki</button>
            </div>
        </div>
    );
}
