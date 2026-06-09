import { useState, useEffect, useCallback } from 'react';
import { securityService } from '../../../services/securityService';
import type { SecurityEventDto, SecurityEventFilter } from '../../../services/securityService';

const EVENT_TYPES = ['failed_login', 'rate_limited', 'capability_denied', 'enumeration_detected'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const severityBadge = (s: string) => {
    const map: Record<string, string> = {
        low: 'bg-slate-100 text-slate-600',
        medium: 'bg-yellow-100 text-yellow-700',
        high: 'bg-orange-100 text-orange-700',
        critical: 'bg-red-100 text-red-700',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600';
};

const eventIcon = (type: string) => {
    const icons: Record<string, string> = {
        failed_login: '🔐',
        rate_limited: '⏱️',
        capability_denied: '🚫',
        enumeration_detected: '🔍',
    };
    return icons[type] ?? '⚠️';
};

export default function SecurityTab() {
    const [events, setEvents] = useState<SecurityEventDto[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const [filter, setFilter] = useState<SecurityEventFilter>({});
    const [ipInput, setIpInput] = useState('');
    const [eventTypeInput, setEventTypeInput] = useState('');
    const [severityInput, setSeverityInput] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const load = useCallback(async (p: number, f: SecurityEventFilter) => {
        setLoading(true);
        try {
            const res = await securityService.getEvents({ ...f, page: p, pageSize });
            if (res.data.success) {
                setEvents(res.data.data);
                setTotalCount(res.data.totalCount);
            }
        } catch {
            /* hata sessizce geçer */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(page, filter);
    }, [page, filter, load]);

    const applyFilter = () => {
        const f: SecurityEventFilter = {};
        if (ipInput.trim()) f.ipAddress = ipInput.trim();
        if (eventTypeInput) f.eventType = eventTypeInput;
        if (severityInput) f.severity = severityInput;
        if (startDate) f.startDate = startDate;
        if (endDate) f.endDate = endDate;
        setFilter(f);
        setPage(1);
    };

    const clearFilter = () => {
        setIpInput('');
        setEventTypeInput('');
        setSeverityInput('');
        setStartDate('');
        setEndDate('');
        setFilter({});
        setPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-800">Güvenlik İzleme</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Başarısız giriş, rate-limit, capability denied ve enumeration olayları
                    </p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {totalCount} olay
                </span>
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    <input
                        type="text"
                        placeholder="IP adresi..."
                        value={ipInput}
                        onChange={e => setIpInput(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <select
                        value={eventTypeInput}
                        onChange={e => setEventTypeInput(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                        <option value="">Tüm türler</option>
                        {EVENT_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <select
                        value={severityInput}
                        onChange={e => setSeverityInput(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                        <option value="">Tüm seviyeler</option>
                        {SEVERITIES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <input
                        type="datetime-local"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        title="Başlangıç tarihi"
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <input
                        type="datetime-local"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        title="Bitiş tarihi"
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                </div>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={applyFilter}
                        className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
                    >
                        Filtrele
                    </button>
                    <button
                        onClick={clearFilter}
                        className="border border-slate-200 text-slate-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition"
                    >
                        Temizle
                    </button>
                </div>
            </div>

            {/* Tablo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Tarih</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Tür</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Seviye</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">IP</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Kullanıcı</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Yol</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Detay</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Yükleniyor...</td>
                                </tr>
                            ) : events.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                                        Kayıt bulunamadı
                                    </td>
                                </tr>
                            ) : (
                                events.map(ev => (
                                    <tr key={ev.id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs font-mono">
                                            {new Date(ev.createdAt).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="font-mono text-xs">
                                                {eventIcon(ev.eventType)} {ev.eventType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${severityBadge(ev.severity)}`}>
                                                {ev.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-700">
                                            {ev.ipAddress}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                            {ev.userId ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate" title={ev.path ?? ''}>
                                            {ev.path ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate" title={ev.detail ?? ''}>
                                            {ev.detail ?? '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sayfalama */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                            Sayfa {page} / {totalPages} ({totalCount} kayıt)
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                ‹ Önceki
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                Sonraki ›
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
