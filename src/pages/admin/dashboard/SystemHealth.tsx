import { useEffect, useState } from 'react';
import { metricsService } from '../../../services/metricsService';
import { fmtDateTime } from '../../../utils/dateFormat';

// Backend SystemHealthDto ile tam eşleşen arayüz
interface TrafficDataPoint {
    timestamp: string;
    responseTime: number;
    totalRequests: number;
}

interface CityProblemDensity {
    cityCode: number;
    problemCount: number;
    problemWithLocationCount: number;
    userCount: number;
}

interface SystemHealthData {
    totalRequests: number;
    totalErrors: number;
    averageResponseTimeMs: number;
    activeUsers: number;
    ramUsageMb: number;
    trafficHistory: TrafficDataPoint[];
    turkeyMapData: CityProblemDensity[];
}

function StatCard({ icon, label, value, sub, highlight }: {
    icon: string; label: string; value: string; sub?: string; highlight?: 'red' | 'green' | 'blue';
}) {
    const colorMap = {
        red:   'border-red-200 bg-red-50',
        green: 'border-emerald-200 bg-emerald-50',
        blue:  'border-indigo-200 bg-indigo-50',
    };
    const textMap = {
        red:   'text-red-700',
        green: 'text-emerald-700',
        blue:  'text-indigo-700',
    };
    return (
        <div className={`rounded-2xl border p-5 ${highlight ? colorMap[highlight] : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-3xl font-black ${highlight ? textMap[highlight] : 'text-gray-900'}`}>{value}</div>
            {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
    );
}

function StatRow({ label, value, badge }: {
    label: string; value: string; badge?: { text: string; cls: string };
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b last:border-0">
            <span className="text-sm text-gray-600">{label}</span>
            <div className="flex items-center gap-2">
                {badge && <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge.cls}`}>{badge.text}</span>}
                <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
        </div>
    );
}

export default function SystemHealthPage() {
    const [data, setData] = useState<SystemHealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [error, setError] = useState('');

    const load = () => {
        setLoading(true);
        setError('');
        metricsService.getSystemHealth()
            .then(r => {
                const payload = (r.data as any)?.data ?? r.data;
                if (payload && typeof payload === 'object' && 'ramUsageMb' in payload) {
                    setData(payload as SystemHealthData);
                    setLastRefresh(new Date());
                } else {
                    setError('Veri formatı beklenenden farklı.');
                }
            })
            .catch(() => setError('Sunucu bağlantısı kurulamadı.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    if (loading && !data) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
    if (error) return (
        <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
                Tekrar Dene
            </button>
        </div>
    );
    if (!data) return null;

    const errorRate = data.totalRequests > 0
        ? ((data.totalErrors / data.totalRequests) * 100).toFixed(2)
        : '0.00';
    const errorHighlight = data.totalErrors > 0 ? 'red' : 'green';

    // Son trafik noktası (en güncel response time)
    const latestTraffic = data.trafficHistory?.at(-1);

    // Top şehirler (problem sayısına göre)
    const topCities = [...(data.turkeyMapData ?? [])]
        .sort((a, b) => b.problemCount - a.problemCount)
        .slice(0, 8);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Sistem Sağlığı</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Son güncelleme: {lastRefresh.toLocaleTimeString('tr')}</p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition disabled:opacity-50"
                >
                    <span className={loading ? 'animate-spin inline-block' : ''}>↺</span>
                    Yenile
                </button>
            </div>

            {/* ── Özet Kartlar ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard icon="📨" label="Toplam İstek" value={data.totalRequests.toLocaleString()} />
                <StatCard
                    icon={data.totalErrors > 0 ? '🔴' : '🟢'}
                    label="Hata Sayısı"
                    value={data.totalErrors.toLocaleString()}
                    sub={`%${errorRate} hata oranı`}
                    highlight={errorHighlight}
                />
                <StatCard
                    icon="⚡"
                    label="Ort. Yanıt Süresi"
                    value={`${data.averageResponseTimeMs.toFixed(1)} ms`}
                    highlight={data.averageResponseTimeMs > 1000 ? 'red' : data.averageResponseTimeMs > 500 ? undefined : 'green'}
                />
                <StatCard icon="👥" label="Aktif Kullanıcı" value={data.activeUsers.toString()} sub="Son 5 dakika" highlight="blue" />
                <StatCard
                    icon="🧠"
                    label="RAM Kullanımı"
                    value={`${data.ramUsageMb.toFixed(0)} MB`}
                    highlight={data.ramUsageMb > 1024 ? 'red' : undefined}
                />
            </div>

            {/* ── Trafik Özeti ─────────────────────────────────────────── */}
            {data.trafficHistory && data.trafficHistory.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">Trafik Geçmişi</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Zaman</th>
                                    <th className="pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Toplam İstek</th>
                                    <th className="pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Yanıt Süresi (ms)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...data.trafficHistory].reverse().slice(0, 10).map((p, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 text-gray-600 font-mono text-xs">
                                            {fmtDateTime(p.timestamp)}
                                        </td>
                                        <td className="py-2 text-right font-semibold">{p.totalRequests.toLocaleString()}</td>
                                        <td className={`py-2 text-right font-semibold ${p.responseTime > 1000 ? 'text-red-600' : p.responseTime > 500 ? 'text-amber-600' : 'text-green-600'}`}>
                                            {p.responseTime.toFixed(1)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {latestTraffic && (
                        <p className="text-xs text-gray-400 mt-3">
                            En son kayıt: {fmtDateTime(latestTraffic.timestamp)}
                        </p>
                    )}
                </div>
            )}

            {/* ── Özet Detaylar ────────────────────────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-2">Performans Özeti</h2>
                <StatRow label="Toplam İşlenen İstek" value={data.totalRequests.toLocaleString()} />
                <StatRow
                    label="Toplam Hata"
                    value={data.totalErrors.toLocaleString()}
                    badge={data.totalErrors === 0
                        ? { text: 'Temiz', cls: 'bg-green-100 text-green-700' }
                        : { text: 'Hata Var', cls: 'bg-red-100 text-red-700' }}
                />
                <StatRow label="Ortalama Yanıt Süresi" value={`${data.averageResponseTimeMs.toFixed(2)} ms`}
                    badge={data.averageResponseTimeMs > 500
                        ? { text: 'Yavaş', cls: 'bg-amber-100 text-amber-700' }
                        : { text: 'Normal', cls: 'bg-green-100 text-green-700' }}
                />
                <StatRow label="RAM Kullanımı" value={`${data.ramUsageMb.toFixed(2)} MB`} />
                <StatRow label="Aktif Kullanıcı (5 dk)" value={data.activeUsers.toString()} />
                <StatRow label="Hata Oranı" value={`%${errorRate}`} />
            </div>

            {/* ── Şehir Dağılımı ───────────────────────────────────────── */}
            {topCities.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">Şehir Bazlı Dağılım (Top 8)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    {['Şehir Kodu', 'Kullanıcı', 'Problem', 'Konumlu Problem'].map(h => (
                                        <th key={h} className="pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider pr-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {topCities.map(c => (
                                    <tr key={c.cityCode} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 pr-4 font-mono font-bold text-indigo-700">{c.cityCode}</td>
                                        <td className="py-2 pr-4">{c.userCount.toLocaleString()}</td>
                                        <td className="py-2 pr-4 font-semibold">{c.problemCount.toLocaleString()}</td>
                                        <td className="py-2 pr-4 text-gray-500">{c.problemWithLocationCount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
