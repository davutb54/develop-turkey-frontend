import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { institutionService } from '../../../services/institutionService';
import { reportService } from '../../../services/reportService';
import { feedbackService } from '../../../services/feedbackService';
import { metricsService, type OverviewMetrics } from '../../../services/metricsService';
import type { AdminDashboardDto, DashboardAnalyticsDto, Institution, ProblemDetailDto } from '../../../types';
import { useCapability } from '../../../hooks/useCapability';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

function formatUptime(hours: number): string {
    const days = Math.floor(hours / 24);
    const h = Math.floor(hours % 24);
    const m = Math.floor((hours * 60) % 60);
    if (days > 0) return `${days}g ${h}s ${m}dk`;
    return `${h}s ${m}dk`;
}

function snapshotAge(loadedAt: string): string {
    const mins = Math.floor((Date.now() - new Date(loadedAt).getTime()) / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins}dk önce`;
    return `${Math.floor(mins / 60)}s önce`;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#a855f7', '#f97316', '#14b8a6', '#f43f5e'];

export default function AdminOverview() {
    const canView = useCapability('admin.dashboard_view');
    const [stats, setStats] = useState<AdminDashboardDto | null>(null);
    const [analytics, setAnalytics] = useState<DashboardAnalyticsDto | null>(null);
    const [overview, setOverview] = useState<OverviewMetrics | null>(null);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [pendingReportsCount, setPendingReportsCount] = useState(0);
    const [expertSolutions, setExpertSolutions] = useState<any[]>([]);
    const [feedbackCount, setFeedbackCount] = useState(0);
    const [problems, setProblems] = useState<ProblemDetailDto[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    const [overviewInstFilter, setOverviewInstFilter] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const results = await Promise.allSettled([
                adminService.getDashboardStats(),
                adminService.getDashboardAnalytics(),
                metricsService.getOverview(),
                institutionService.getAll(),
                reportService.getPending(),
                adminService.getPendingExpertSolutions(),
                feedbackService.getAllPaged({ page: 1, pageSize: 1 }),
                adminService.getAllProblems(),
                adminService.getAllTopics(),
            ]);
            const [statsRes, analyticsRes, overviewRes, instRes, reportsRes, expertRes, feedbackRes, problemsRes, topicsRes] = results;

            if (statsRes.status === 'fulfilled' && statsRes.value.data.success) setStats(statsRes.value.data.data);
            if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data.success) setAnalytics(analyticsRes.value.data.data);
            if (overviewRes.status === 'fulfilled' && overviewRes.value.data.success) setOverview(overviewRes.value.data.data);
            if (instRes.status === 'fulfilled' && instRes.value.data.success) setInstitutions(instRes.value.data.data ?? []);
            if (reportsRes.status === 'fulfilled' && reportsRes.value.data.success) setPendingReportsCount(reportsRes.value.data.data?.length ?? 0);
            if (expertRes.status === 'fulfilled' && expertRes.value.data.success) setExpertSolutions(expertRes.value.data.data ?? []);
            if (feedbackRes.status === 'fulfilled' && (feedbackRes.value.data as any).success) setFeedbackCount((feedbackRes.value.data as any).totalCount ?? 0);
            if (problemsRes.status === 'fulfilled' && problemsRes.value.data.success) setProblems(problemsRes.value.data.data ?? []);
            if (topicsRes.status === 'fulfilled' && topicsRes.value.data.success) setTopics(topicsRes.value.data.data ?? []);

            setLoading(false);
        };
        load();
    }, []);

    const recentProblems = [...problems]
        .sort((a, b) => new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime())
        .slice(0, 5);

    const topicDistribution = topics.map(t => {
        const count = problems.filter(p => p.topics?.some((pt: any) => pt.id === t.id)).length;
        return { name: t.name, count, institutionId: t.institutionId };
    }).sort((a, b) => b.count - a.count);

    const filteredTopicDist = overviewInstFilter
        ? topicDistribution.filter(t => t.institutionId?.toString() === overviewInstFilter)
        : topicDistribution;

    const filteredTotal = overviewInstFilter
        ? problems.filter(p => p.institutionId?.toString() === overviewInstFilter).length
        : problems.length;

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    if (!canView) return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;
    if (!stats) return null;

    return (
        <div className="p-6 md:p-10 animate-fade-in space-y-8">
            {/* Başlık */}
            <div>
                <h1 className="text-2xl font-black text-slate-900">Genel Bakış</h1>
                <p className="text-slate-500 text-sm mt-1">Platform genelinde özet istatistikler.</p>
            </div>

            {/* Bölüm 1: 6 Büyük Stat Kartı */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-5 rounded-3xl text-white shadow-lg shadow-blue-200 transition-transform hover:-translate-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1 block">Kullanıcılar</span>
                    <span className="text-4xl font-black block">{stats.totalUsers}</span>
                    {overview && (
                        <span className="text-xs opacity-75 mt-1.5 block">+{overview.newUsersLast7Days} bu hafta</span>
                    )}
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-3xl text-white shadow-lg shadow-green-200 transition-transform hover:-translate-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1 block">Sorunlar</span>
                    <span className="text-4xl font-black block">{stats.totalProblems}</span>
                    <span className="text-xs opacity-75 mt-1.5 block">{stats.reportedProblems} bildirildi</span>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 p-5 rounded-3xl text-white shadow-lg shadow-purple-200 transition-transform hover:-translate-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1 block">Çözümler</span>
                    <span className="text-4xl font-black block">{stats.totalSolutions}</span>
                    {overview && (
                        <span className="text-xs opacity-75 mt-1.5 block">{overview.totalComments} yorum</span>
                    )}
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 rounded-3xl text-white shadow-lg shadow-red-200 transition-transform hover:-translate-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1 block">Bekleyen Şikayet</span>
                    <span className="text-4xl font-black block">{pendingReportsCount}</span>
                    <span className="text-xs opacity-75 mt-1.5 block">inceleme bekliyor</span>
                </div>

                <div className="bg-gradient-to-br from-slate-600 to-slate-800 p-5 rounded-3xl text-white shadow-lg transition-transform hover:-translate-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1 block">Banlı Kullanıcı</span>
                    <span className="text-4xl font-black block">{stats.bannedUsers}</span>
                    <span className="text-xs opacity-75 mt-1.5 block">hesap askıya alındı</span>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-5 rounded-3xl text-white shadow-lg shadow-orange-200 transition-transform hover:-translate-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1 block">Aktif Workflow</span>
                    <span className="text-4xl font-black block">{overview?.activeWorkflowDefs ?? '—'}</span>
                    {overview && (
                        <span className="text-xs opacity-75 mt-1.5 block">{overview.workflowRunsLast24h} çalışma (24s)</span>
                    )}
                </div>
            </div>

            {/* Bölüm 2: Platform Sağlık Çubuğu */}
            {overview && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Sistem Uptime</p>
                            <p className="text-sm font-black text-slate-900">{formatUptime(overview.uptimeHours)}</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">WF Başarı Oranı (24s)</p>
                            <p className="text-sm font-black text-slate-900">{overview.workflowSuccessRateLast24h.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Yetki Snapshot</p>
                            <p className="text-sm font-black text-slate-900">
                                {overview.snapshotEntryCount} entry
                                <span className="text-slate-400 font-normal"> · {snapshotAge(overview.snapshotLoadedAt)}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bölüm 3: Bekleyen İşlemler + Son Sorunlar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bekleyen İşlemler */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
                    <h2 className="text-lg font-black text-slate-900 mb-5">Bekleyen İşlemler</h2>
                    <div className="space-y-3">
                        <Link
                            to="/admin/reports"
                            className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Bekleyen Şikayet</p>
                                    <p className="text-xs text-slate-500">İnceleme gerektiriyor</p>
                                </div>
                            </div>
                            <span className="bg-rose-500 text-white text-sm font-black px-3 py-1 rounded-full">{pendingReportsCount}</span>
                        </Link>

                        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Uzman Çözüm Onayı</p>
                                        <p className="text-xs text-slate-500">Onay bekleyen çözümler</p>
                                    </div>
                                </div>
                                <span className="bg-indigo-500 text-white text-sm font-black px-3 py-1 rounded-full">{expertSolutions.length}</span>
                            </div>
                            {expertSolutions.length > 0 && (
                                <div className="space-y-1.5">
                                    {expertSolutions.slice(0, 3).map((sol: any) => (
                                        <div key={sol.id} className="flex items-center gap-2 text-xs text-slate-600 bg-white/70 rounded-xl px-3 py-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            <span className="truncate">{sol.title || sol.description || `Çözüm #${sol.id}`}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Link
                            to="/admin/feedbacks"
                            className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Geri Bildirimler</p>
                                    <p className="text-xs text-slate-500">Gelen kutusu</p>
                                </div>
                            </div>
                            <span className="bg-amber-500 text-white text-sm font-black px-3 py-1 rounded-full">{feedbackCount}</span>
                        </Link>

                        {/* Kurum Sayısı */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Kayıtlı Kurum</p>
                                    <p className="text-xs text-slate-500">Aktif ağlar</p>
                                </div>
                            </div>
                            <span className="bg-slate-700 text-white text-sm font-black px-3 py-1 rounded-full">{institutions.length}</span>
                        </div>
                    </div>
                </div>

                {/* Son 5 Sorun */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
                    <h2 className="text-lg font-black text-slate-900 mb-5">Son Sorunlar</h2>
                    {recentProblems.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-8">Henüz sorun bulunamadı.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentProblems.map(p => {
                                const inst = institutions.find(i => i.id === p.institutionId);
                                const statusClass = p.isResolved
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : p.isReported
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-slate-100 text-slate-600';
                                const dotClass = p.isResolved
                                    ? 'bg-emerald-500'
                                    : p.isReported
                                        ? 'bg-rose-500'
                                        : 'bg-slate-400';
                                return (
                                    <div key={p.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{p.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-xs text-slate-500 truncate">{inst?.name ?? 'Bilinmiyor'}</span>
                                                <span className="text-slate-300 text-xs">·</span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(p.sendDate).toLocaleDateString('tr-TR')}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${statusClass}`}>
                                            {p.isResolved ? 'Çözüldü' : p.isReported ? 'Bildirildi' : 'Açık'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bölüm 4: 3 Grafik */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kategori Dağılımı */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-base font-black text-slate-800">Kategori Dağılımı</h3>
                        <select
                            className="border border-slate-200 shadow-sm px-2 py-1.5 rounded-lg text-xs bg-white font-medium text-slate-700 outline-none max-w-[130px] truncate"
                            value={overviewInstFilter}
                            onChange={e => setOverviewInstFilter(e.target.value)}
                        >
                            <option value="">Tüm Kurumlar</option>
                            {institutions.map(i => (
                                <option key={i.id} value={String(i.id)}>{i.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-3.5">
                        {filteredTopicDist.slice(0, 6).map((td, index) => {
                            const pct = filteredTotal > 0 ? Math.round((td.count / filteredTotal) * 100) : 0;
                            return (
                                <div key={td.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold text-slate-700 truncate mr-2">{td.name}</span>
                                        <span className="text-slate-500 font-medium shrink-0">
                                            {td.count} <span className="opacity-60">({pct}%)</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {filteredTopicDist.length === 0 && (
                            <p className="text-slate-400 text-xs text-center py-4">Kategori bulunamadı.</p>
                        )}
                    </div>
                </div>

                {/* Kurum Bazlı Sorun Dağılımı */}
                {analytics ? (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 h-[420px]">
                        <h3 className="text-base font-black text-slate-800 mb-4">Kurum Bazlı Sorunlar</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <PieChart>
                                <Pie
                                    data={analytics.problemsByInstitution}
                                    dataKey="count"
                                    nameKey="institutionName"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={4}
                                >
                                    {analytics.problemsByInstitution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend iconType="circle" iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 h-[420px] flex items-center justify-center">
                        <p className="text-slate-400 text-sm">Veri yok</p>
                    </div>
                )}

                {/* Son 30 Gün Kayıtlar */}
                {analytics ? (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 h-[420px]">
                        <h3 className="text-base font-black text-slate-800 mb-4">Son 30 Gün Kayıtlar</h3>
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={analytics.userRegistrationsLast30Days}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={9}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    name="Kayıt Sayısı"
                                    stroke="#4f46e5"
                                    strokeWidth={2.5}
                                    dot={{ r: 0 }}
                                    activeDot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 h-[420px] flex items-center justify-center">
                        <p className="text-slate-400 text-sm">Veri yok</p>
                    </div>
                )}
            </div>
        </div>
    );
}
