import { useEffect, useState } from 'react';
import { metricsService, type DeadLetterItem } from '../../../services/metricsService';
import { fmtDateTimeSec } from '../../../utils/dateFormat';

const PAGE_SIZE = 30;

export default function WorkflowDeadLetterTab() {
    const [items, setItems] = useState<DeadLetterItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [requeueing, setRequeueing] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = (p: number) => {
        setLoading(true);
        metricsService.getDeadLetters(p, PAGE_SIZE)
            .then(r => {
                if (!r.data.success) return;
                const data = r.data.data;
                setItems(prev => p === 1 ? (data.items ?? []) : [...prev, ...(data.items ?? [])]);
                setTotal(data.total ?? 0);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(1); }, []);

    const handleRequeue = (id: string) => {
        setRequeueing(id);
        metricsService.requeueDeadLetter(id)
            .then(() => {
                setItems(prev => prev.map(i => i.id === id
                    ? { ...i, isRequeued: true, requeuedAt: new Date().toISOString() }
                    : i));
            })
            .catch(() => alert('Yeniden kuyruğa alma başarısız.'))
            .finally(() => setRequeueing(null));
    };

    const pending = items.filter(i => !i.isRequeued).length;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Başlık */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dead-Letter Kuyruk</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Maksimum retry aşıldıktan sonra buraya düşen mesajlar — toplam {total}, bekleyen {pending}
                    </p>
                </div>
                <button
                    onClick={() => { setPage(1); setItems([]); load(1); }}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                    🔃 Yenile
                </button>
            </div>

            {items.length === 0 && !loading && (
                <div className="text-center py-20 text-gray-400">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-lg font-medium">Dead-letter kuyruğu boş</p>
                    <p className="text-sm mt-1">Tüm mesajlar başarıyla işlendi.</p>
                </div>
            )}

            {loading && items.length === 0 && (
                <div className="text-center py-20 text-gray-400">Yükleniyor…</div>
            )}

            {items.length > 0 && (
                <div className="space-y-3">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`border rounded-2xl overflow-hidden transition-all ${
                                item.isRequeued
                                    ? 'border-green-100 bg-green-50/30'
                                    : 'border-red-100 bg-white'
                            }`}
                        >
                            {/* Satır başlığı */}
                            <div
                                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50"
                                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                            >
                                <span className="text-xl flex-shrink-0">
                                    {item.isRequeued ? '✅' : '💀'}
                                </span>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-mono text-xs text-gray-400">{item.id.slice(0, 8)}…</span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                            {item.reason}
                                        </span>
                                        {item.runId && (
                                            <span className="text-xs text-gray-400">Run: {item.runId.slice(0, 8)}…</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 truncate">
                                        {item.errorDetail ?? 'Hata detayı yok'}
                                    </p>
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <div className="text-xs text-gray-400">{fmtDateTimeSec(item.createdAt)}</div>
                                    {item.isRequeued && (
                                        <div className="text-xs text-green-600 mt-0.5">
                                            Yeniden kuyruğa alındı · {fmtDateTimeSec(item.requeuedAt)}
                                        </div>
                                    )}
                                </div>

                                {!item.isRequeued && (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleRequeue(item.id); }}
                                        disabled={requeueing === item.id}
                                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                        {requeueing === item.id ? '⏳' : '↩ Yeniden Kuyruğa Al'}
                                    </button>
                                )}
                            </div>

                            {/* Genişletilmiş detay */}
                            {expanded === item.id && (
                                <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        {[
                                            { label: 'Run ID',       value: item.runId ?? '—' },
                                            { label: 'Node Run ID',  value: item.nodeRunId ?? '—' },
                                            { label: 'Action Run ID',value: item.actionRunId ?? '—' },
                                            { label: 'Sebep',        value: item.reason },
                                        ].map(f => (
                                            <div key={f.label}>
                                                <div className="text-gray-400 mb-0.5">{f.label}</div>
                                                <div className="font-mono text-gray-700 break-all">{f.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {item.errorDetail && (
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">Hata Detayı</div>
                                            <pre className="text-xs bg-red-50 border border-red-100 rounded-xl p-3 text-red-700 whitespace-pre-wrap overflow-x-auto">
                                                {item.errorDetail}
                                            </pre>
                                        </div>
                                    )}

                                    {item.payloadJson && (
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">Payload JSON</div>
                                            <pre className="text-xs bg-gray-900 text-green-400 rounded-xl p-3 whitespace-pre-wrap overflow-x-auto max-h-48">
                                                {(() => { try { return JSON.stringify(JSON.parse(item.payloadJson!), null, 2); } catch { return item.payloadJson; } })()}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Daha fazla yükle */}
            {items.length < total && (
                <div className="text-center mt-6">
                    <button
                        onClick={() => { const next = page + 1; setPage(next); load(next); }}
                        disabled={loading}
                        className="px-6 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {loading ? 'Yükleniyor…' : `Daha Fazla (${total - items.length} kaldı)`}
                    </button>
                </div>
            )}
        </div>
    );
}
