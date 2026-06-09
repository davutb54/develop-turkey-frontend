import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../../../services/reportService';
import { adminService } from '../../../services/adminService';
import { solutionService } from '../../../services/solutionService';
import { userService } from '../../../services/userService';
import type { ReportDto, ProblemDetailDto, SolutionDetailDto, UserDetailDto } from '../../../types';
import { useCapability } from '../../../hooks/useCapability';

export default function ReportsTab() {
    const canResolve       = useCapability('moderation.report_resolve');
    const canDeleteProblem = useCapability('moderation.problem_delete');
    const canDeleteSolution = useCapability('moderation.solution_delete');
    const canBanUser       = useCapability('admin.user_ban');
    const [pendingReports, setPendingReports] = useState<ReportDto[]>([]);
    const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
    const [solutions, setSolutions] = useState<SolutionDetailDto[]>([]);
    const [users, setUsers] = useState<UserDetailDto[]>([]);
    const [loading, setLoading] = useState(true);

    const [reportTab, setReportTab] = useState<'problems' | 'solutions' | 'users'>('problems');
    const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [reportRes, probRes, solRes] = await Promise.all([
                reportService.getPending(),
                adminService.getAllProblems(),
                adminService.getAllSolutions(),
            ]);
            if (reportRes.data.success) setPendingReports(reportRes.data.data || []);
            if (probRes.data.success) setProblems(probRes.data.data);
            if (solRes.data.success) setSolutions(solRes.data.data);

            // Fetch all users for user-report target lookup
            const userRes = await userService.getAll();
            if (userRes.data.success) setUsers(userRes.data.data || []);
        } catch (err) {
            console.error('Şikayetler yüklenemedi', err);
        } finally {
            setLoading(false);
        }
    };

    const problemReports = pendingReports.filter(r => r.targetType === 'Problem');
    const solutionReports = pendingReports.filter(r => r.targetType === 'Solution');
    const userReports = pendingReports.filter(r => r.targetType === 'User');

    const toggleReportSelection = (reportId: number) => {
        setSelectedReportIds(prev =>
            prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
        );
    };

    const handleResolveReport = async (reportId: number) => {
        if (!window.confirm('Bu şikayeti kapatmak istediğinize emin misiniz?')) return;
        try {
            await reportService.resolve(reportId);
            load();
        } catch {
            alert('Şikayet kapatılamadı.');
        }
    };

    const handleDeleteReportedContent = async (reportId: number, targetType: string, targetId: number) => {
        if (!window.confirm('Bu İÇERİĞİ SİLMEK ve şikayeti kapatmak istediğinize emin misiniz?')) return;
        try {
            if (targetType === 'Problem') await adminService.deleteProblem(targetId);
            if (targetType === 'Solution') await solutionService.delete(targetId);
            await reportService.resolve(reportId);
            load();
        } catch {
            alert('İşlem başarısız oldu.');
        }
    };

    const handleBulkResolve = async (reportIds: number[]) => {
        if (!window.confirm(`${reportIds.length} adet şikayeti topluca kapatmak istediğinize emin misiniz?`)) return;
        try {
            await Promise.all(reportIds.map(id => reportService.resolve(id)));
            setSelectedReportIds([]);
            load();
        } catch {
            alert('İşlem başarısız.');
        }
    };

    const handleBulkDeleteContent = async (reportIds: number[]) => {
        if (!window.confirm(`${reportIds.length} adet İÇERİĞİ SİLMEK ve şikayetleri kapatmak istediğinize emin misiniz?`)) return;
        try {
            const promises = reportIds.map(async (reportId) => {
                const report = pendingReports.find(r => r.id === reportId);
                if (!report) return;
                if (report.targetType === 'Problem') await adminService.deleteProblem(report.targetId);
                if (report.targetType === 'Solution') await solutionService.delete(report.targetId);
                await reportService.resolve(reportId);
            });
            await Promise.all(promises);
            setSelectedReportIds([]);
            load();
        } catch {
            alert('İşlem başarısız.');
        }
    };

    const handleBanUser = async (userId: number) => {
        if (!window.confirm('Kullanıcıyı banlamak istediğinize emin misiniz?')) return;
        try {
            await adminService.banUser(userId);
            load();
        } catch {
            alert('Ban işlemi başarısız.');
        }
    };

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 animate-fade-in flex flex-col h-full">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Şikayet Merkezi</h1>
                <p className="text-slate-500 text-sm mt-1">Bekleyen içerik ve kullanıcı şikayetlerini yönetin.</p>
            </div>

            {/* Sub-tab bar */}
            <div className="flex bg-slate-50 p-2 rounded-2xl mb-8 border border-slate-200 shadow-inner">
                <button
                    onClick={() => { setReportTab('problems'); setSelectedReportIds([]); }}
                    className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'problems' ? 'bg-white shadow-md text-red-600 border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Sorun Şikayetleri <span className="ml-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{problemReports.length}</span>
                </button>
                <button
                    onClick={() => { setReportTab('solutions'); setSelectedReportIds([]); }}
                    className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'solutions' ? 'bg-white shadow-md text-red-600 border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Çözüm Şikayetleri <span className="ml-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{solutionReports.length}</span>
                </button>
                <button
                    onClick={() => { setReportTab('users'); setSelectedReportIds([]); }}
                    className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all ${reportTab === 'users' ? 'bg-white shadow-md text-red-600 border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Kullanıcı Şikayetleri <span className="ml-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{userReports.length}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-5 max-h-[600px]">
                {/* Bulk action bar */}
                {selectedReportIds.length > 0 && (
                    <div className="bg-indigo-600 text-white p-3 rounded-xl mb-4 flex justify-between items-center shadow-md animate-fade-in sticky top-0 z-20">
                        <div className="font-bold text-sm">{selectedReportIds.length} öğe seçildi</div>
                        <div className="flex gap-2">
                            {canResolve && (
                            <button
                                onClick={() => handleBulkResolve(selectedReportIds)}
                                className="px-4 py-1.5 bg-white text-indigo-700 font-bold rounded-lg text-sm hover:bg-slate-100 transition shadow-sm"
                            >
                                Toplu Çöz (Kapat)
                            </button>
                            )}
                            {reportTab !== 'users' && (reportTab === 'problems' ? canDeleteProblem : canDeleteSolution) && (
                                <button
                                    onClick={() => handleBulkDeleteContent(selectedReportIds)}
                                    className="px-4 py-1.5 bg-red-500 text-white font-bold rounded-lg text-sm border border-red-400 hover:bg-red-400 transition shadow-sm"
                                >
                                    İçerikleri Sil &amp; Kapat
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Problem Reports */}
                {reportTab === 'problems' && (
                    problemReports.length === 0
                        ? <div className="text-center py-16 text-slate-400 font-medium">Bekleyen sorun şikayeti yok.</div>
                        : problemReports.map(report => {
                            const targetProblem = problems.find(p => p.id === report.targetId);
                            return (
                                <div key={report.id} className="border border-red-100 bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-red-400 to-rose-600"></div>
                                    <div className="mb-6 flex items-start gap-4">
                                        <div className="pt-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedReportIds.includes(report.id)}
                                                onChange={() => toggleReportSelection(report.id)}
                                                className="w-5 h-5 rounded border-red-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                            />
                                        </div>
                                        <p className="flex-1 text-rose-900 font-medium bg-rose-50 p-4 rounded-xl border border-rose-100 text-sm">{report.reason}</p>
                                    </div>
                                    {targetProblem ? (
                                        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <div>
                                                <Link to={`/problem/${targetProblem.publicId || targetProblem.id}`} target="_blank" className="font-black text-lg text-slate-800 hover:text-indigo-600 transition">{targetProblem.title}</Link>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                {canResolve && <button onClick={() => handleResolveReport(report.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 shadow-sm transition">Kapat</button>}
                                                {canDeleteProblem && <button onClick={() => handleDeleteReportedContent(report.id, 'Problem', targetProblem.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-md transition">Sil</button>}
                                            </div>
                                        </div>
                                    ) : (
                                        canResolve && <button onClick={() => handleResolveReport(report.id)} className="text-xs bg-slate-100 p-2 rounded">Kapat (Zaten Silinmiş)</button>
                                    )}
                                </div>
                            );
                        })
                )}

                {/* Solution Reports */}
                {reportTab === 'solutions' && (
                    solutionReports.length === 0
                        ? <div className="text-center py-16 text-slate-400 font-medium">Bekleyen çözüm şikayeti yok.</div>
                        : solutionReports.map(report => {
                            const targetSolution = solutions.find(s => s.id === report.targetId);
                            return (
                                <div key={report.id} className="border border-orange-100 bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-400 to-amber-500"></div>
                                    <div className="mb-6 flex items-start gap-4">
                                        <div className="pt-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedReportIds.includes(report.id)}
                                                onChange={() => toggleReportSelection(report.id)}
                                                className="w-5 h-5 rounded border-orange-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                            />
                                        </div>
                                        <p className="flex-1 text-orange-900 font-medium bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm">{report.reason}</p>
                                    </div>
                                    {targetSolution ? (
                                        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <div className="font-black text-lg text-slate-800 line-clamp-2">{targetSolution.title}</div>
                                            <div className="flex gap-2 shrink-0">
                                                {canResolve && <button onClick={() => handleResolveReport(report.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 shadow-sm transition">Kapat</button>}
                                                {canDeleteSolution && <button onClick={() => handleDeleteReportedContent(report.id, 'Solution', targetSolution.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-orange-500 rounded-xl hover:bg-orange-600 shadow-md transition">Sil</button>}
                                            </div>
                                        </div>
                                    ) : (
                                        canResolve && <button onClick={() => handleResolveReport(report.id)} className="text-xs bg-slate-100 p-2 rounded">Kapat (Zaten Silinmiş)</button>
                                    )}
                                </div>
                            );
                        })
                )}

                {/* User Reports */}
                {reportTab === 'users' && (
                    userReports.length === 0
                        ? <div className="text-center py-16 text-slate-400 font-medium">Bekleyen kullanıcı şikayeti yok.</div>
                        : userReports.map(report => {
                            const targetUser = users.find(u => u.id === report.targetId);
                            return (
                                <div key={report.id} className="border border-purple-100 bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-400 to-indigo-600"></div>
                                    <div className="mb-6 flex items-start gap-4">
                                        <div className="pt-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedReportIds.includes(report.id)}
                                                onChange={() => toggleReportSelection(report.id)}
                                                className="w-5 h-5 rounded border-purple-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                            />
                                        </div>
                                        <p className="flex-1 text-purple-900 font-medium bg-purple-50 p-4 rounded-xl border border-purple-100 text-sm">{report.reason}</p>
                                    </div>
                                    {targetUser ? (
                                        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <Link to={`/user/${targetUser.userName}`} target="_blank" className="font-black text-lg text-slate-800 hover:text-purple-600 transition">@{targetUser.userName}</Link>
                                            <div className="flex gap-2 shrink-0">
                                                {canResolve && <button onClick={() => handleResolveReport(report.id)} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 shadow-sm transition">Kapat</button>}
                                                {canBanUser && <button
                                                    onClick={() => { handleBanUser(targetUser.id); handleResolveReport(report.id); }}
                                                    className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-purple-600 rounded-xl hover:bg-purple-700 shadow-md transition"
                                                >
                                                    Banla
                                                </button>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <span className="text-sm text-slate-500">Kullanıcı ID: {report.targetId}</span>
                                            {canResolve && <button onClick={() => handleResolveReport(report.id)} className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-bold">Kapat</button>}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}
