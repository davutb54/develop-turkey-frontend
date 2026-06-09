import { useState, useCallback } from 'react';
import { metricsService, type AuditLogEntry, type AuditLogFilter, type PagedResult } from '../../../services/metricsService';
import { useCapability } from '../../../hooks/useCapability';
import { useWorkflowStore } from '../../../components/workflow/useWorkflowStore';
import { fmtDateTimeSec } from '../../../utils/dateFormat';

const ACTION_TYPES = [
    { value: '',                    label: 'Tüm İşlemler' },
    { value: 'grant',               label: 'grant — Manuel ver' },
    { value: 'revoke',              label: 'revoke — Manuel kaldır' },
    { value: 'workflow_grant',      label: 'workflow_grant — Workflow ile verilen' },
    { value: 'template_apply',      label: 'template_apply — Şablon uygulaması' },
    { value: 'bootstrap_admin',     label: 'bootstrap_admin — Admin bootstrap' },
    { value: 'default_on_register', label: 'default_on_register — Kayıt default' },
    { value: 'ban',                 label: 'ban — Ban işlemi' },
    { value: 'unban',               label: 'unban — Ban kaldırma' },
    { value: 'warn',                label: 'warn — Uyarı' },
];

const ACTION_BADGE: Record<string, string> = {
    grant:               'bg-emerald-100 text-emerald-800',
    revoke:              'bg-red-100 text-red-800',
    workflow_grant:      'bg-indigo-100 text-indigo-800',
    template_apply:      'bg-purple-100 text-purple-800',
    bootstrap_admin:     'bg-amber-100 text-amber-800',
    default_on_register: 'bg-sky-100 text-sky-800',
    ban:                 'bg-red-200 text-red-900',
    unban:               'bg-green-100 text-green-800',
    warn:                'bg-orange-100 text-orange-800',
};

const PAGE_SIZE = 20;

export default function CapabilityAuditTab() {
    const canRead = useCapability('admin.capability_audit_read');
    const availableCapabilities = useWorkflowStore(s => s.availableCapabilities);

    const [filter, setFilter] = useState<AuditLogFilter>({ page: 1, pageSize: PAGE_SIZE });
    const [result, setResult] = useState<PagedResult<AuditLogEntry> | null>(null);
    const [loading, setLoading] = useState(false);
    const [jsonModal, setJsonModal] = useState<string | null>(null);

    // Form state (ayrı tutulur — arama butonu ile gönderilir)
    const [actorId, setActorId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [action, setAction] = useState('');
    const [capCode, setCapCode] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const search = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const f: AuditLogFilter = {
                actorUserId: actorId ? parseInt(actorId) : undefined,
                targetUserId: targetId ? parseInt(targetId) : undefined,
                action: action || undefined,
                capabilityCode: capCode || undefined,
                from: from || undefined,
                to: to || undefined,
                page,
                pageSize: PAGE_SIZE,
            };
            setFilter(f);
            const res = await metricsService.getAuditLog(f);
            if (res.data?.success) setResult(res.data.data);
        } catch { }
        finally { setLoading(false); }
    }, [actorId, targetId, action, capCode, from, to]);

    const reset = () => {
        setActorId(''); setTargetId(''); setAction('');
        setCapCode(''); setFrom(''); setTo('');
        setResult(null);
    };

    const totalPages = result ? Math.ceil(result.totalCount / PAGE_SIZE) : 1;
    const currentPage = filter.page ?? 1;

    if (!canRead) {
        return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;
    }

    return (
        <div className="p-6 md:p-10 animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900">Yetki Logları</h1>
                <p className="text-slate-500 text-sm mt-1">Tüm yetki grant / revoke / şablon uygulama kayıtları.</p>
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Aktör Kullanıcı ID</label>
                        <input type="number" value={actorId} onChange={e => setActorId(e.target.value)} placeholder="Kullanıcı ID"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Hedef Kullanıcı ID</label>
                        <input type="number" value={targetId} onChange={e => setTargetId(e.target.value)} placeholder="Kullanıcı ID"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">İşlem Türü</label>
                        <select value={action} onChange={e => setAction(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                            {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Yetki Kodu</label>
                        <select value={capCode} onChange={e => setCapCode(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                            <option value="">— Tüm Kodlar —</option>
                            {availableCapabilities.map(c => (
                                <option key={c.code} value={c.code}>{c.code}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Başlangıç Tarihi</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Bitiş Tarihi</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => search(1)} disabled={loading}
                        className="px-5 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20">
                        {loading ? 'Aranıyor...' : 'Ara'}
                    </button>
                    <button onClick={reset}
                        className="px-5 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition">
                        Sıfırla
                    </button>
                </div>
            </div>

            {/* Sonuçlar */}
            {result && (
                <>
                    <div className="text-xs text-slate-500 mb-3">{result.totalCount} kayıt bulundu</div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {['Zaman', 'İşlem', 'Aktör', 'Hedef', 'Yetki Kodu', 'Detay'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {result.items.map(entry => (
                                        <tr key={entry.id} className="hover:bg-slate-50 transition">
                                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                                {fmtDateTimeSec(entry.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ACTION_BADGE[entry.action] ?? 'bg-gray-100 text-gray-800'}`}>
                                                    {entry.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-600">{entry.actorUserId || '—'}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-600">{entry.targetUserId || '—'}</td>
                                            <td className="px-4 py-3">
                                                {entry.capabilityCode ? (
                                                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                                                        {entry.capabilityCode}
                                                    </span>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {entry.payloadJson && (
                                                    <button
                                                        onClick={() => setJsonModal(entry.payloadJson!)}
                                                        className="text-[10px] text-indigo-500 hover:text-indigo-700 underline"
                                                    >
                                                        JSON ↗
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Sayfalama */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                                <span className="text-xs text-slate-500">Sayfa {currentPage} / {totalPages}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => search(currentPage - 1)} disabled={currentPage <= 1}
                                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition">‹</button>
                                    <button onClick={() => search(currentPage + 1)} disabled={currentPage >= totalPages}
                                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition">›</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!result && !loading && (
                <div className="text-center text-slate-400 py-16">
                    Filtreleri doldurup "Ara" butonuna tıklayın.
                </div>
            )}

            {/* JSON Modal */}
            {jsonModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setJsonModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b flex items-center justify-between">
                            <span className="font-black text-slate-700">Payload JSON</span>
                            <button onClick={() => setJsonModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <pre className="px-5 py-4 text-xs font-mono text-slate-700 whitespace-pre-wrap break-all">
                            {(() => { try { return JSON.stringify(JSON.parse(jsonModal), null, 2); } catch { return jsonModal; } })()}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
