import { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { institutionService } from '../../../services/institutionService';
import type { Log, Institution } from '../../../types';
import { fmtDateTime } from '../../../utils/dateFormat';
import { useCapability } from '../../../hooks/useCapability';

export default function ActivityLogsTab() {
    const canView = useCapability('admin.audit_read');
    const [activityLogs, setActivityLogs] = useState<Log[]>([]);
    const [activityLogPage, setActivityLogPage] = useState(1);
    const [hasMoreActivityLogs, setHasMoreActivityLogs] = useState(true);
    const [activityLogLoading, setActivityLogLoading] = useState(false);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [activityLogFilter, setActivityLogFilter] = useState({
        searchText: '',
        institutionId: '',
        category: '',
    });

    useEffect(() => {
        const loadInstitutions = async () => {
            try {
                const res = await institutionService.getAll();
                if (res.data.success) setInstitutions(res.data.data);
            } catch { /* silently fail */ }
        };
        loadInstitutions();
    }, []);

    // Re-fetch when filter changes
    useEffect(() => {
        setActivityLogPage(1);
        fetchActivityLogs(1, false);
    }, [activityLogFilter.institutionId, activityLogFilter.category]);

    // Initial load
    useEffect(() => {
        fetchActivityLogs(1, false);
    }, []);

    const fetchActivityLogs = async (page: number, append: boolean) => {
        setActivityLogLoading(true);
        try {
            const res = await adminService.getLogs({
                isActivityLog: true,
                page,
                pageSize: 20,
                searchText: activityLogFilter.searchText || undefined,
                institutionId: activityLogFilter.institutionId ? parseInt(activityLogFilter.institutionId) : undefined,
                category: activityLogFilter.category || undefined,
            });
            if (res.data.success) {
                const newData: Log[] = res.data.data;
                setHasMoreActivityLogs(newData.length >= 20);
                if (append) setActivityLogs(prev => [...prev, ...newData]);
                else setActivityLogs(newData);
            }
        } catch (err) {
            console.error('Aksiyon geçmişi çekilemedi', err);
        } finally {
            setActivityLogLoading(false);
        }
    };

    if (!canView) return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;

    return (
        <div className="p-6 md:p-10 animate-fade-in relative max-w-5xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Yönetici Aksiyon Geçmişi</h1>
                    <p className="text-slate-500 text-sm mt-1">Admin ve moderatör tarafından gerçekleştirilen işlemler.</p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-48">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kurum Filtresi</label>
                        <select
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white shadow-sm"
                            value={activityLogFilter.institutionId}
                            onChange={e => setActivityLogFilter({ ...activityLogFilter, institutionId: e.target.value })}
                        >
                            <option value="">Tüm Kurumlar</option>
                            {institutions.map(inst => (
                                <option key={inst.id} value={inst.id!}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-40">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategori</label>
                        <select
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white shadow-sm"
                            value={activityLogFilter.category}
                            onChange={e => setActivityLogFilter({ ...activityLogFilter, category: e.target.value })}
                        >
                            <option value="">Tüm Aksiyonlar</option>
                            <option value="AdminAction">Genel Admin</option>
                            <option value="Feature">Özellik (Feature)</option>
                            <option value="FeatureDefinition">Özellik Tanımı</option>
                            <option value="Security">Güvenlik</option>
                            <option value="Institution">Kurum Ayarları</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setActivityLogFilter({ searchText: '', institutionId: '', category: '' })}
                        className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
                    >
                        Temizle
                    </button>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {activityLogs.length === 0 && !activityLogLoading && (
                    <div className="text-center py-10 text-slate-500 font-medium">Henüz hiçbir aksiyon kaydı bulunmuyor.</div>
                )}
                {activityLogs.map(log => {
                    const isRed = log.level === 'Critical' || log.level === 'Error' || log.action === 'Ban' || log.message.toLowerCase().includes('ban');
                    const isYellow = log.action === 'Security' || log.level === 'Warning' || log.message.toLowerCase().includes('sildi');

                    const bgColor = isRed ? 'bg-red-500' : isYellow ? 'bg-amber-500' : 'bg-blue-500';
                    const textColor = isRed ? 'text-red-700' : isYellow ? 'text-amber-700' : 'text-blue-700';
                    const badgeBg = isRed ? 'bg-red-100' : isYellow ? 'bg-amber-100' : 'bg-blue-100';
                    const iconPath = isRed
                        ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                        : isYellow
                            ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                            : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';

                    return (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${bgColor} text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                                </svg>
                            </div>
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl shadow border border-slate-100 hover:shadow-md transition">
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full ${badgeBg} ${textColor}`}>
                                        {log.category} - {log.action}
                                    </span>
                                    <time className="text-xs font-bold text-slate-400">
                                        {fmtDateTime(log.creationDate)}
                                    </time>
                                </div>
                                <p className="text-sm font-medium text-slate-700 leading-snug">{log.message}</p>
                                {log.userName && (
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {log.userName}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Load more */}
            {hasMoreActivityLogs && (
                <div className="text-center mt-8 pb-4">
                    <button
                        onClick={() => {
                            const nextPage = activityLogPage + 1;
                            setActivityLogPage(nextPage);
                            fetchActivityLogs(nextPage, true);
                        }}
                        disabled={activityLogLoading}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-indigo-600 font-bold rounded-full shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                        {activityLogLoading ? 'Yükleniyor...' : 'Daha Eski Aksiyonları Yükle'}
                    </button>
                </div>
            )}

            {activityLogLoading && activityLogs.length === 0 && (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
                </div>
            )}
        </div>
    );
}
