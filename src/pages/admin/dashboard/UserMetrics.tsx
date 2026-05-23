import { useEffect, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { metricsService, type UserMetrics } from '../../../services/metricsService';

export default function UserMetricsPage() {
    const [data, setData] = useState<UserMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        metricsService.getUsers()
            .then(r => setData(r.data.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
    if (!data) return <div className="text-center py-20 text-red-500">Veriler yüklenemedi.</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-black text-gray-900">Kullanıcı Metrikleri</h1>

            {/* Özet */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Toplam Kullanıcı',    value: data.totalUsers.toLocaleString(),      color: 'text-gray-900' },
                    { label: 'Banlı',               value: data.bannedUsers.toLocaleString(),     color: 'text-red-600' },
                    { label: 'Uyarılı',             value: data.warnedUsers.toLocaleString(),     color: 'text-orange-500' },
                    { label: 'Doğrulanmamış',       value: data.unverifiedUsers.toLocaleString(), color: 'text-yellow-600' },
                ].map(c => (
                    <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{c.label}</div>
                        <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Kayıt Trendi */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-4">Günlük Yeni Kayıt (30 gün)</h2>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.newUserTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Yeni Kayıt" dot={false} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kuruma Göre Dağılım */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">Kuruma Göre Kullanıcı Sayısı</h2>
                    {data.perInstitution.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">Henüz kurum verisi yok.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart layout="vertical" data={data.perInstitution}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="institutionName" type="category" tick={{ fontSize: 10 }} width={140} />
                                <Tooltip />
                                <Bar dataKey="userCount" fill="#3b82f6" name="Kullanıcı" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Top Contributor'lar */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-gray-800 mb-4">En Aktif Katkıcılar (Top 10)</h2>
                    {data.topContributors.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">Henüz katkıcı verisi yok.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart layout="vertical" data={data.topContributors.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="userName" type="category" tick={{ fontSize: 10 }} width={100} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="problemCount"  stackId="a" fill="#8b5cf6" name="Problem" />
                                <Bar dataKey="solutionCount" stackId="a" fill="#10b981" name="Çözüm" />
                                <Bar dataKey="commentCount"  stackId="a" fill="#f59e0b" name="Yorum" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Katkıcı Detay Tablosu */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h2 className="text-lg font-black text-gray-800 mb-4">Katkıcı Sıralaması</h2>
                {data.topContributors.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Henüz katkı yok.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="pb-2">#</th>
                                    <th className="pb-2">Kullanıcı</th>
                                    <th className="pb-2 text-right">Problem</th>
                                    <th className="pb-2 text-right">Çözüm</th>
                                    <th className="pb-2 text-right">Yorum</th>
                                    <th className="pb-2 text-right font-black">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topContributors.map((c, i) => (
                                    <tr key={c.userId} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 text-gray-400">{i + 1}</td>
                                        <td className="py-2 font-medium">@{c.userName}</td>
                                        <td className="py-2 text-right text-purple-600">{c.problemCount}</td>
                                        <td className="py-2 text-right text-green-600">{c.solutionCount}</td>
                                        <td className="py-2 text-right text-yellow-600">{c.commentCount}</td>
                                        <td className="py-2 text-right font-black text-gray-900">{c.total}</td>
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
