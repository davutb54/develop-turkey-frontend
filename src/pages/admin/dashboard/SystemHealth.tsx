import { useEffect, useState } from 'react';
import { metricsService } from '../../../services/metricsService';

interface SystemHealthData {
    uptimeSeconds: number;
    ramUsedMb: number;
    ramTotalMb: number;
    snapshotEntryCount: number;
    snapshotLoadedAt: string;
    errorCount24h: number;
    cpuUsagePercent?: number;
    dbVersion?: string;
    environment?: string;
}

function HealthBar({ label, used, total, unit, color = 'blue' }: {
    label: string; used: number; total: number; unit: string; color?: string;
}) {
    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : `bg-${color}-500`;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-semibold">{label}</span>
                <span className="text-gray-500">{used.toFixed(0)} / {total} {unit} ({pct}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className={`h-3 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function StatRow({ label, value, badge }: { label: string; value: string; badge?: { text: string; color: string } }) {
    return (
        <div className="flex items-center justify-between py-3 border-b last:border-0">
            <span className="text-sm text-gray-600">{label}</span>
            <div className="flex items-center gap-2">
                {badge && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge.color}`}>{badge.text}</span>
                )}
                <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
        </div>
    );
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}g`);
    if (h > 0) parts.push(`${h}s`);
    parts.push(`${m}dk`);
    return parts.join(' ');
}

export default function SystemHealthPage() {
    const [data, setData] = useState<SystemHealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const load = () => {
        setLoading(true);
        metricsService.getSystemHealth()
            .then(r => {
                // Backend /metrics/system-health payload direkt data içinde
                const payload = r.data?.data ?? r.data;
                setData(payload);
                setLastRefresh(new Date());
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    if (loading && !data) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
    if (!data) return <div className="text-center py-20 text-red-500">Veriler yüklenemedi.</div>;

    const snapshotAge = data.snapshotLoadedAt
        ? Math.round((Date.now() - new Date(data.snapshotLoadedAt).getTime()) / 60000)
        : 0;
    const snapshotOk = snapshotAge < 60;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-gray-900">Sistem Sağlığı</h1>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition disabled:opacity-50"
                >
                    <span className={loading ? 'animate-spin' : ''}>↺</span>
                    Yenile
                </button>
            </div>
            <p className="text-xs text-gray-400 -mt-6">Son güncelleme: {lastRefresh.toLocaleTimeString('tr')}</p>

            {/* Özet kartlar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Uptime',
                        value: formatUptime((data.uptimeSeconds ?? 0)),
                        color: 'text-green-600',
                        icon: '🟢',
                    },
                    {
                        label: 'RAM Kullanımı',
                        value: `${data.ramUsedMb?.toFixed(0) ?? '?'} MB`,
                        color: (data.ramUsedMb ?? 0) > 500 ? 'text-red-600' : 'text-blue-600',
                        icon: '🧠',
                    },
                    {
                        label: 'Snapshot Girdi',
                        value: (data.snapshotEntryCount ?? 0).toLocaleString(),
                        color: snapshotOk ? 'text-green-600' : 'text-red-600',
                        icon: snapshotOk ? '✅' : '⚠️',
                    },
                    {
                        label: 'Snapshot Yaşı',
                        value: `${snapshotAge} dk önce`,
                        color: snapshotOk ? 'text-gray-600' : 'text-red-500',
                        icon: '🕐',
                    },
                    {
                        label: 'Hata (24s)',
                        value: (data.errorCount24h ?? 0).toLocaleString(),
                        color: (data.errorCount24h ?? 0) > 0 ? 'text-red-600' : 'text-green-600',
                        icon: (data.errorCount24h ?? 0) > 0 ? '🔴' : '🟢',
                    },
                    ...(data.cpuUsagePercent !== undefined ? [{
                        label: 'CPU',
                        value: `${data.cpuUsagePercent.toFixed(1)}%`,
                        color: data.cpuUsagePercent > 80 ? 'text-red-600' : 'text-gray-700',
                        icon: '⚙️',
                    }] : []),
                ].map(c => (
                    <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <span>{c.icon}</span> {c.label}
                        </div>
                        <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* RAM Bar */}
            {data.ramTotalMb && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">Bellek Kullanımı</h2>
                    <HealthBar
                        label="RAM"
                        used={data.ramUsedMb ?? 0}
                        total={data.ramTotalMb}
                        unit="MB"
                        color="blue"
                    />
                </div>
            )}

            {/* Sistem Detayları */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-2">Detaylar</h2>
                <StatRow
                    label="Snapshot Durumu"
                    value={`${(data.snapshotEntryCount ?? 0).toLocaleString()} kayıt`}
                    badge={snapshotOk
                        ? { text: 'Sağlıklı', color: 'bg-green-100 text-green-700' }
                        : { text: 'Eski', color: 'bg-red-100 text-red-700' }}
                />
                <StatRow
                    label="Snapshot Yükleme Zamanı"
                    value={data.snapshotLoadedAt
                        ? new Date(data.snapshotLoadedAt).toLocaleString('tr')
                        : '—'}
                />
                <StatRow label="Uptime" value={formatUptime(data.uptimeSeconds ?? 0)} />
                <StatRow
                    label="Hata Sayısı (son 24 saat)"
                    value={(data.errorCount24h ?? 0).toString()}
                    badge={(data.errorCount24h ?? 0) === 0
                        ? { text: 'Temiz', color: 'bg-green-100 text-green-700' }
                        : { text: 'Hata Var', color: 'bg-red-100 text-red-700' }}
                />
                {data.environment && (
                    <StatRow
                        label="Ortam"
                        value={data.environment}
                        badge={data.environment === 'Production'
                            ? { text: 'PROD', color: 'bg-blue-100 text-blue-700' }
                            : { text: 'DEV', color: 'bg-yellow-100 text-yellow-700' }}
                    />
                )}
                {data.dbVersion && (
                    <StatRow label="Veritabanı" value={data.dbVersion} />
                )}
            </div>
        </div>
    );
}
