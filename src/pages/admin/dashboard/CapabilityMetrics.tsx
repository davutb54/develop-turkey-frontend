import { useEffect, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { metricsService, type CapabilityMetrics } from '../../../services/metricsService';
import { fmtTime } from '../../../utils/dateFormat';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export default function CapabilityMetricsPage() {
    const [data, setData] = useState<CapabilityMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        metricsService.getCapabilities()
            .then(r => setData(r.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
    if (!data) return <div className="text-center py-20 text-red-500">Veriler yüklenemedi.</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-black text-gray-900">Yetki (Capability) Metrikleri</h1>

            {/* Özet kartlar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Toplam Entry', value: data.snapshotEntryCount.toLocaleString() },
                    { label: 'Benzersiz Kullanıcı', value: data.uniqueUsers.toLocaleString() },
                    { label: 'Ort. Yetki/Kullanıcı', value: data.avgCapsPerUser },
                    { label: 'Snapshot', value: fmtTime(data.snapshotLoadedAt) },
                ].map(c => (
                    <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{c.label}</div>
                        <div className="text-2xl font-black text-gray-900">{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Grant/Revoke Trendi */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-4">Grant / Revoke Trendi (30 gün)</h2>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.grantRevokeTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="grants" stroke="#3b82f6" name="Grant" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="revokes" stroke="#ef4444" name="Revoke" dot={false} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kategori Dağılımı */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">Kategori Dağılımı</h2>
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                            <Pie data={data.categoryBreakdown} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                                {data.categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Capabilities */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">En Çok Grant Edilen (Top 15)</h2>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart layout="vertical" data={data.topCapabilities.slice(0, 15)}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="code" type="category" tick={{ fontSize: 10 }} width={160} />
                            <Tooltip />
                            <Bar dataKey="grantCount" fill="#3b82f6" name="Grant Sayısı" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Users */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-4">En Çok Yetkiye Sahip Kullanıcılar</h2>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">#</th>
                        <th className="pb-2">Kullanıcı</th>
                        <th className="pb-2 text-right">Yetki Sayısı</th>
                    </tr></thead>
                    <tbody>
                        {data.topUsers.map((u, i) => (
                            <tr key={u.userId} className="border-b last:border-0">
                                <td className="py-2 text-gray-400">{i + 1}</td>
                                <td className="py-2 font-medium">@{u.userName}</td>
                                <td className="py-2 text-right font-black text-blue-600">{u.capabilityCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}
