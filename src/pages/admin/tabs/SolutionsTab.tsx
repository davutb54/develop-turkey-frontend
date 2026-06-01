import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { solutionService } from '../../../services/solutionService';
import { institutionService } from '../../../services/institutionService';
import type { SolutionDetailDto, ProblemDetailDto, Institution } from '../../../types';
import { useCapability } from '../../../hooks/useCapability';

const ITEMS_PER_PAGE = 8;

export default function SolutionsTab() {
    const canHighlight = useCapability('moderation.solution_highlight');
    const canDelete    = useCapability('moderation.solution_delete');
    const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
    const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);

    const [solutionSearch, setSolutionSearch] = useState('');
    const [solutionStatus, setSolutionStatus] = useState('');
    const [solutionInst, setSolutionInst] = useState('');
    const [solutionPage, setSolutionPage] = useState(1);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [solRes, probRes, instRes] = await Promise.all([
                    adminService.getAllSolutions(),
                    adminService.getAllProblems(),
                    institutionService.getAll(),
                ]);
                if (solRes.data.success) setSolutions(solRes.data.data);
                if (probRes.data.success) setProblems(probRes.data.data);
                if (instRes.data.success) setInstitutions(instRes.data.data);
            } catch (err) { console.error('Çözümler yüklenemedi', err); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const reload = async () => {
        try {
            const [solRes, probRes] = await Promise.all([
                adminService.getAllSolutions(),
                adminService.getAllProblems(),
            ]);
            if (solRes.data.success) setSolutions(solRes.data.data);
            if (probRes.data.success) setProblems(probRes.data.data);
        } catch (err) { console.error('Yenileme başarısız', err); }
    };

    const filteredSolutions = solutions.filter(s => {
        const matchSearch = s.title.toLowerCase().includes(solutionSearch.toLowerCase()) || s.senderUsername.toLowerCase().includes(solutionSearch.toLowerCase());
        let matchStatus = true;
        if (solutionStatus === 'highlighted') matchStatus = s.isHighlighted;
        let matchInst = true;
        if (solutionInst !== '') {
            const relatedProblem = problems.find(p => p.id === s.problemId);
            matchInst = relatedProblem ? relatedProblem.institutionId?.toString() === solutionInst : false;
        }
        return matchSearch && matchStatus && matchInst;
    });

    const groupedSolutions = filteredSolutions.reduce((acc: any, sol) => {
        if (!acc[sol.problemId]) acc[sol.problemId] = {
            problemId: sol.problemId,
            problemName: problems.find(p => p.id === sol.problemId)?.title || 'Bilinmeyen Sorun',
            solutions: [],
        };
        acc[sol.problemId].solutions.push(sol);
        return acc;
    }, {});

    const groupedSolutionsArray = Object.values(groupedSolutions) as any[];
    const paginatedGroups = groupedSolutionsArray.slice((solutionPage - 1) * ITEMS_PER_PAGE, solutionPage * ITEMS_PER_PAGE);

    const handleDeleteSolution = async (id: number) => {
        if (!window.confirm('Bu çözümü silmek istediğinize emin misiniz?')) return;
        try { await solutionService.delete(id); reload(); } catch { alert('Silinemedi.'); }
    };

    const handleToggleHighlight = async (id: number) => {
        try { await adminService.toggleSolutionHighlight(id); reload(); }
        catch { alert('Öne çıkarma işlemi başarısız.'); }
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 animate-fade-in flex flex-col h-full">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Çözümler</h1>
                <p className="text-slate-500 text-sm mt-1">Tüm paylaşılan çözümleri yönetin.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <input type="text" placeholder="Çözüm veya yazar ara..." className="flex-1 border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" value={solutionSearch} onChange={e => { setSolutionSearch(e.target.value); setSolutionPage(1); }} />
                <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={solutionInst} onChange={e => { setSolutionInst(e.target.value); setSolutionPage(1); }}>
                    <option value="">Tüm Kurumlar</option>
                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={solutionStatus} onChange={e => { setSolutionStatus(e.target.value); setSolutionPage(1); }}>
                    <option value="">Aktif Çözümler</option>
                    <option value="highlighted">Sadece Vitrindekiler</option>
                </select>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 max-h-[600px]">
                {paginatedGroups.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 font-medium">Çözüm bulunamadı.</div>
                ) : paginatedGroups.map((group: any, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">İlgili Sorun</span>
                                <Link to={`/problem/${group.problemId}`} target="_blank" className="font-black text-slate-800 text-lg hover:text-indigo-600 transition flex items-center gap-2">
                                    {group.problemName}
                                </Link>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {group.solutions.map((sol: any) => (
                                <div key={sol.id} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-start gap-4 hover:shadow-md transition">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Link to={`/user/${sol.senderId}`} target="_blank" className="font-bold text-indigo-900 text-sm hover:underline">@{sol.senderUsername}</Link>
                                            <span className="text-[10px] text-slate-400 font-medium">{new Date(sol.sendDate).toLocaleDateString('tr-TR')}</span>
                                            {sol.isHighlighted && <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] px-2 py-0.5 rounded font-black tracking-wider shadow-sm">VİTRİN</span>}
                                        </div>
                                        <p className="text-sm text-slate-700 line-clamp-2">{sol.title}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Link to={`/problem/${group.problemId}?solution=${sol.id}`} target="_blank" className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition shadow-sm">Çözüme Git</Link>
                                        {canHighlight && <button onClick={() => handleToggleHighlight(sol.id)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition border shadow-sm ${sol.isHighlighted ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}>
                                            {sol.isHighlighted ? 'Vitrinden Al' : 'Vitrine Koy'}
                                        </button>}
                                        {canDelete && <button onClick={() => handleDeleteSolution(sol.id)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 transition shadow-sm">Sil</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mt-4 px-2">
                <button onClick={() => setSolutionPage(p => Math.max(1, p - 1))} disabled={solutionPage === 1} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Önceki</button>
                <span className="text-sm font-bold text-slate-600">Sayfa {solutionPage} / {Math.ceil(groupedSolutionsArray.length / ITEMS_PER_PAGE) || 1}</span>
                <button onClick={() => setSolutionPage(p => p + 1)} disabled={solutionPage >= Math.ceil(groupedSolutionsArray.length / ITEMS_PER_PAGE)} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Sonraki</button>
            </div>
        </div>
    );
}
