import { useEffect, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { metricsService, type WorkflowMetrics } from '../../../services/metricsService';

const STATUS_COLORS: Record<string, string> = {
    success: '#10b981',
    partial: '#f59e0b',
    failed: '#ef4444',
    error: '#ef4444',
};

export default function WorkflowMetricsPage() {
    const [data, setData] = useState<WorkflowMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        metricsService.getWorkflow()
            .then(r => setData(r.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
    if (!data) return <div className="text-center py-20 text-red-500">Veriler yüklenemedi.</div>;

    const donutData = [
        { name: 'Başarılı', value: data.successCount, color: '#10b981' },
        { name: 'Kısmi', value: data.partialCount, color: '#f59e0b' },
        { name: 'Başarısız', value: data.failedCount, color: '#ef4444' },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-black text-gray-900">Workflow Metrikleri</h1>

            {/* Özet */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Toplam Çalışma', value: data.totalRuns.toLocaleString(), color: 'text-gray-900' },
                    { label: 'Başarı Oranı', value: `%${data.successRate}`, color: 'text-green-600' },
                    { label: 'Başarısız', value: data.failedCount.toLocaleString(), color: 'text-red-600' },
                    { label: 'Ort. Süre', value: `${Math.round(data.avgDurationMs)} ms`, color: 'text-blue-600' },
                ].map(c => (
                    <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{c.label}</div>
                        <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Run Trendi */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-4">Günlük Çalışma (30 gün)</h2>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.runCountTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total" stroke="#6b7280" name="Toplam" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="success" stroke="#10b981" name="Başarılı" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Başarısız" dot={false} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Durum Dağılımı */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">Durum Dağılımı</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Tetikleyiciler */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">Top Tetikleyiciler</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart layout="vertical" data={data.topTriggers}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="triggerEvent" type="category" tick={{ fontSize: 10 }} width={140} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8b5cf6" name="Sayı" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Son Başarısız Çalışmalar */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-4">Son Başarısız Çalışmalar</h2>
                {data.recentFailedRuns.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Başarısız çalışma yok 🎉</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">Kural</th>
                                <th className="pb-2">Tetikleyici</th>
                                <th className="pb-2">Durum</th>
                                <th className="pb-2">Süre</th>
                                <th className="pb-2">Hata</th>
                                <th className="pb-2">Zaman</th>
                            </tr></thead>
                            <tbody>
                                {data.recentFailedRuns.map(r => (
                                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 font-medium">{r.ruleName}</td>
                                        <td className="py-2 text-gray-500 text-xs">{r.triggerEvent}</td>
                                        <td className="py-2">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${STATUS_COLORS[r.status]}20`, color: STATUS_COLORS[r.status] }}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-2 text-gray-500">{r.durationMs}ms</td>
                                        <td className="py-2 text-red-500 text-xs max-w-xs truncate">{r.errorMessage}</td>
                                        <td className="py-2 text-gray-400 text-xs">{new Date(r.executedAt).toLocaleString('tr')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
