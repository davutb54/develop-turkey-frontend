import { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { institutionService } from '../../../services/institutionService';
import type { Log, LogFilterDto, Institution } from '../../../types';
import { fmtDate, fmtTime } from '../../../utils/dateFormat';
import { useCapability } from '../../../hooks/useCapability';

export default function SystemLogsTab() {
    const canView = useCapability('admin.audit_read');
    const [logs, setLogs] = useState<Log[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [logFilter, setLogFilter] = useState<LogFilterDto>({});
    const [logPage, setLogPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<Log | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInstitutions = async () => {
            try {
                const res = await institutionService.getAll();
                if (res.data.success) setInstitutions(res.data.data);
            } catch { /* silently fail */ }
        };
        loadInstitutions();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [logPage]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const filterToSend: LogFilterDto = {
                searchText: logFilter.searchText || undefined,
                endDate: logFilter.endDate ? `${logFilter.endDate}T23:59:59` : undefined,
                category: logFilter.category || undefined,
                action: logFilter.action || undefined,
                level: logFilter.level || undefined,
                institutionId: logFilter.institutionId || undefined,
                page: logPage,
                pageSize: 20,
            };
            const res = await adminService.getLogs(filterToSend);
            if (res.data.success) setLogs(res.data.data);
        } catch (err) {
            console.error('Loglar çekilemedi', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterLogs = (e: React.FormEvent) => {
        e.preventDefault();
        setLogPage(1);
        fetchLogs();
    };

    const clearLogFilters = () => {
        setLogFilter({});
        setLogPage(1);
        setTimeout(fetchLogs, 100);
    };

    const exportToJSON = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', `logs_export_${Date.now()}.json`);
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const exportToCSV = () => {
        if (logs.length === 0) return;
        const headers = Object.keys(logs[0]).join(',');
        const rows = logs.map(log =>
            Object.values(log).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
        const a = document.createElement('a');
        a.setAttribute('href', encodeURI(csvContent));
        a.setAttribute('download', `logs_export_${Date.now()}.csv`);
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const renderLogDetail = (detailsString: string) => {
        try {
            const obj = JSON.parse(detailsString);
            if (obj.ExceptionType) {
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase">Tip</span>
                                <br />
                                <span className="text-red-600 font-bold">{obj.ExceptionType}</span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase">IP &amp; User</span>
                                <br />
                                {obj.ClientIp} - ID: {obj.UserId || 'Anonim'}
                            </div>
                            <div className="col-span-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Endpoint</span>
                                <br />
                                <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono text-sm">{obj.Endpoint}</span>
                            </div>
                        </div>
                        {obj.SuggestedSolutions && obj.SuggestedSolutions.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                <h4 className="font-bold text-amber-800 mb-2">Olası Çözümler</h4>
                                <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                                    {obj.SuggestedSolutions.map((sol: string, i: number) => <li key={i}>{sol}</li>)}
                                </ul>
                            </div>
                        )}
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase mb-2 block">Stack Trace</span>
                            <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl overflow-x-auto text-xs whitespace-pre-wrap font-mono shadow-inner border border-slate-800">
                                {obj.StackTrace}
                            </pre>
                        </div>
                    </div>
                );
            }
            return <pre className="bg-slate-100 p-4 rounded-xl text-xs overflow-x-auto">{JSON.stringify(obj, null, 2)}</pre>;
        } catch {
            return <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border">{detailsString}</pre>;
        }
    };

    if (!canView) return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;

    return (
        <div className="p-6 md:p-10 animate-fade-in flex flex-col h-full">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Sistem Logları (SIEM)</h1>
                    <p className="text-slate-500 text-sm mt-1">Sistemin tüm etkinlik kayıtları.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToJSON} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-black transition shadow-sm flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        JSON İndir
                    </button>
                    <button onClick={exportToCSV} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV İndir
                    </button>
                    <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-bold border border-indigo-100 shadow-sm">{logs.length} Kayıt Gösteriliyor</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner mb-8">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Veritabanı Filtreleme</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Arama (IP, User, Hata)</label>
                        <input
                            type="text"
                            placeholder="IP Adresi veya metin..."
                            className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                            value={logFilter.searchText || ''}
                            onChange={e => setLogFilter({ ...logFilter, searchText: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Kurum</label>
                        <select
                            className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-white"
                            value={logFilter.institutionId?.toString() || ''}
                            onChange={e => setLogFilter({ ...logFilter, institutionId: e.target.value ? parseInt(e.target.value) : undefined })}
                        >
                            <option value="">Tüm Kurumlar</option>
                            {institutions.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Tarih</label>
                        <input
                            type="date"
                            className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                            value={logFilter.endDate ? logFilter.endDate.split('T')[0] : ''}
                            onChange={e => setLogFilter({ ...logFilter, endDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Kategori</label>
                        <select
                            className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-white"
                            value={logFilter.category || ''}
                            onChange={e => { setLogFilter({ ...logFilter, category: e.target.value }); setLogPage(1); }}
                        >
                            <option value="">Tümü</option>
                            <option value="Auth">Auth (Giriş/Kayıt)</option>
                            <option value="Content">Content (İçerik)</option>
                            <option value="Institution">Institution (Kurum)</option>
                            <option value="Moderation">Moderation (Yönetim)</option>
                            <option value="System">System (Sistem)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Seviye</label>
                        <select
                            className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 outline-none text-sm bg-white"
                            value={logFilter.level || ''}
                            onChange={e => { setLogFilter({ ...logFilter, level: e.target.value }); setLogPage(1); }}
                        >
                            <option value="">Tümü</option>
                            <option value="Info">Bilgi (Info)</option>
                            <option value="Warning">Uyarı (Warning)</option>
                            <option value="Error">Hata (Error)</option>
                            <option value="Critical">Kritik (Critical)</option>
                        </select>
                    </div>
                    <div className="flex gap-2 lg:col-start-6">
                        <button onClick={handleFilterLogs} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl text-sm shadow-md hover:bg-black transition">Filtrele</button>
                        <button onClick={clearLogFilters} className="px-4 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-50">Sil</button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm flex-1 max-h-[600px] bg-slate-50/50">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] whitespace-nowrap">Tarih</th>
                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Tetikleyen &amp; Kaynak</th>
                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px]">Olay Tipi</th>
                            <th className="px-5 py-4 font-black text-slate-500 uppercase tracking-widest text-[10px] w-1/2">Mesaj &amp; Detay</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                                <div className="flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-600" /></div>
                            </td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500 font-medium text-lg bg-slate-50">Log kaydı bulunamadı.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-5 py-4 text-xs font-bold text-slate-600 whitespace-nowrap align-top">
                                        {fmtDate(log.creationDate)} <br />
                                        <span className="text-slate-400 font-normal">{fmtTime(log.creationDate)}</span>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <div className="flex items-center gap-1 text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-1 rounded">
                                                <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {log.userName || 'Sistem'}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                                </svg>
                                                {log.ipAddress}:{log.port}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border shadow-sm
                                                ${log.level === 'Info' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                log.level === 'Warning' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                log.level === 'Error' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                log.level === 'Critical' ? 'bg-red-600 text-white border-red-700' :
                                                'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                {log.level}
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {log.category} / {log.action}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-700 font-medium leading-relaxed max-w-lg break-words align-top">
                                        {log.message}
                                        {log.details && (
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="mt-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition flex items-center gap-1 w-max"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Detayları İncele
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 px-2">
                <button
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                    className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm"
                >
                    Önceki Sayfa
                </button>
                <span className="text-sm font-bold text-slate-600">Sayfa {logPage}</span>
                <button
                    onClick={() => setLogPage(p => p + 1)}
                    disabled={logs.length < 20}
                    className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm"
                >
                    Sonraki Sayfa
                </button>
            </div>

            {/* Log detail modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-down border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
                            <h3 className="text-xl font-black text-slate-800">Log Detayı</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            {renderLogDetail(selectedLog.details || '')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
