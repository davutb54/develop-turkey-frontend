import { useEffect, useState, useCallback } from 'react';
import { metricsService, type AuditLogEntry, type AuditLogFilter } from '../../../services/metricsService';

const PAGE_SIZE = 20;

const COMMON_ACTIONS = [
    '', 'grant', 'revoke', 'bootstrap_admin', 'bootstrap_system_user',
    'default_on_register', 'ban', 'unban', 'warn', 'warn_revoke',
];

export default function AuditLogBrowser() {
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<AuditLogEntry | null>(null);

    const [filter, setFilter] = useState<AuditLogFilter>({
        page: 1,
        pageSize: PAGE_SIZE,
    });

    // Form state (geçici — "Ara" butonuna basınca filter'a yansır)
    const [form, setForm] = useState({
        actorUserId: '',
        targetUserId: '',
        action: '',
        from: '',
        to: '',
    });

    const load = useCallback((f: AuditLogFilter) => {
        setLoading(true);
        metricsService.getAuditLog(f)
            .then(r => {
                const paged = r.data.data;
                setEntries(paged.items);
                setTotalCount(paged.totalCount);
            })
            .catch(() => {
                setEntries([]);
                setTotalCount(0);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(filter); }, [filter, load]);

    const applyFilter = () => {
        const f: AuditLogFilter = {
            page: 1,
            pageSize: PAGE_SIZE,
            actorUserId: form.actorUserId ? Number(form.actorUserId) : undefined,
            targetUserId: form.targetUserId ? Number(form.targetUserId) : undefined,
            action: form.action || undefined,
            from: form.from || undefined,
            to: form.to || undefined,
        };
        setPage(1);
        setFilter(f);
    };

    const clearFilter = () => {
        setForm({ actorUserId: '', targetUserId: '', action: '', from: '', to: '' });
        const f: AuditLogFilter = { page: 1, pageSize: PAGE_SIZE };
        setPage(1);
        setFilter(f);
    };

    const goToPage = (p: number) => {
        setPage(p);
        setFilter(prev => ({ ...prev, page: p }));
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('tr', { dateStyle: 'short', timeStyle: 'medium' });

    const actionBadge = (action: string) => {
        if (action === 'grant')  return 'bg-green-100 text-green-700';
        if (action === 'revoke') return 'bg-red-100 text-red-700';
        if (action.startsWith('bootstrap')) return 'bg-blue-100 text-blue-700';
        if (action.includes('ban') || action.includes('warn')) return 'bg-orange-100 text-orange-700';
        return 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-black text-gray-900">Audit Log</h1>

            {/* Filtre paneli */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Aktör ID</label>
                        <input
                            type="number"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            placeholder="örn. 1"
                            value={form.actorUserId}
                            onChange={e => setForm(f => ({ ...f, actorUserId: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Hedef ID</label>
                        <input
                            type="number"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            placeholder="örn. 5"
                            value={form.targetUserId}
                            onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">İşlem</label>
                        <select
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                            value={form.action}
                            onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                        >
                            {COMMON_ACTIONS.map(a => (
                                <option key={a} value={a}>{a || '— Tümü —'}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Başlangıç</label>
                        <input
                            type="date"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            value={form.from}
                            onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Bitiş</label>
                        <input
                            type="date"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            value={form.to}
                            onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={applyFilter}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                            Ara
                        </button>
                        <button
                            onClick={clearFilter}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                            Sıfırla
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                    {loading ? 'Yükleniyor…' : `Toplam ${totalCount.toLocaleString()} kayıt bulundu.`}
                </p>
            </div>

            {/* Tablo */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">Kayıt bulunamadı.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b bg-gray-50">
                                    <th className="px-4 py-3 font-semibold">ID</th>
                                    <th className="px-4 py-3 font-semibold">İşlem</th>
                                    <th className="px-4 py-3 font-semibold">Aktör</th>
                                    <th className="px-4 py-3 font-semibold">Hedef</th>
                                    <th className="px-4 py-3 font-semibold">Zaman</th>
                                    <th className="px-4 py-3 font-semibold">Detay</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(e => (
                                    <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-400 text-xs">{e.id}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${actionBadge(e.action)}`}>
                                                {e.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">
                                            {e.actorUserId === 0 ? (
                                                <span className="text-gray-400 italic">sistem</span>
                                            ) : (
                                                `#${e.actorUserId}`
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">#{e.targetUserId}</td>
                                        <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                                            {formatDate(e.createdAt)}
                                        </td>
                                        <td className="px-4 py-2">
                                            {e.payloadJson ? (
                                                <button
                                                    onClick={() => setSelected(e)}
                                                    className="text-blue-500 hover:text-blue-700 text-xs font-semibold"
                                                >
                                                    JSON ↗
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sayfalama */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Sayfa {page} / {totalPages}
                    </p>
                    <div className="flex gap-1">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={page === 1}
                            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >«</button>
                        <button
                            onClick={() => goToPage(page - 1)}
                            disabled={page === 1}
                            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >‹</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                            const p = start + i;
                            return p <= totalPages ? (
                                <button
                                    key={p}
                                    onClick={() => goToPage(p)}
                                    className={`px-2.5 py-1 text-xs rounded border transition ${
                                        p === page
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {p}
                                </button>
                            ) : null;
                        })}
                        <button
                            onClick={() => goToPage(page + 1)}
                            disabled={page === totalPages}
                            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >›</button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={page === totalPages}
                            className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >»</button>
                    </div>
                </div>
            )}

            {/* JSON Detay Modal */}
            {selected && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b">
                            <div>
                                <h3 className="font-black text-gray-900">
                                    Audit Log #{selected.id}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold mr-2 ${actionBadge(selected.action)}`}>
                                        {selected.action}
                                    </span>
                                    {formatDate(selected.createdAt)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >×</button>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                <div>
                                    <span className="text-gray-400 text-xs uppercase tracking-wide">Aktör</span>
                                    <p className="font-semibold">
                                        {selected.actorUserId === 0 ? 'Sistem' : `#${selected.actorUserId}`}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-xs uppercase tracking-wide">Hedef</span>
                                    <p className="font-semibold">#{selected.targetUserId}</p>
                                </div>
                            </div>
                            {selected.payloadJson && (
                                <>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payload</p>
                                    <pre className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs overflow-auto max-h-60 text-gray-700">
                                        {(() => {
                                            try {
                                                return JSON.stringify(JSON.parse(selected.payloadJson), null, 2);
                                            } catch {
                                                return selected.payloadJson;
                                            }
                                        })()}
                                    </pre>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
