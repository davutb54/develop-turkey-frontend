import { useEffect, useState } from 'react';
import { metricsService, type OverviewMetrics } from '../../../services/metricsService';

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        orange: 'bg-orange-50 border-orange-200 text-orange-700',
        gray: 'bg-gray-50 border-gray-200 text-gray-700',
    };
    return (
        <div className={`border rounded-2xl p-5 ${colorMap[color] ?? colorMap.blue}`}>
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</div>
            <div className="text-3xl font-black">{value}</div>
            {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
        </div>
    );
}

export default function Overview() {
    const [data, setData] = useState<OverviewMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        metricsService.getOverview()
            .then(r => setData(r.data.data))
            .catch(() => setError('Veriler yüklenemedi.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
    if (!data) return null;

    const snapshotAge = data.snapshotLoadedAt
        ? Math.round((Date.now() - new Date(data.snapshotLoadedAt).getTime()) / 60000)
        : 0;

    return (
        <div>
            <h1 className="text-2xl font-black text-gray-900 mb-6">Genel Bakış</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard label="Toplam Kullanıcı" value={data.totalUsers.toLocaleString()} color="blue" />
                <StatCard label="Yeni (7 gün)" value={data.newUsersLast7Days.toLocaleString()} color="green" />
                <StatCard label="Banlı Kullanıcı" value={data.bannedUsers.toLocaleString()} color="red" />
                <StatCard label="Toplam Problem" value={data.totalProblems.toLocaleString()} color="purple" />
                <StatCard label="Toplam Çözüm" value={data.totalSolutions.toLocaleString()} color="purple" />
                <StatCard label="Toplam Yorum" value={data.totalComments.toLocaleString()} color="gray" />
                <StatCard label="Aktif Workflow" value={data.activeWorkflowDefs} color="orange" />
                <StatCard
                    label="WF Çalışma (24s)"
                    value={data.workflowRunsLast24h}
                    sub={`Başarı: %${data.workflowSuccessRateLast24h}`}
                    color="orange"
                />
                <StatCard label="Yetki Grant'ı" value={data.totalCapabilityGrants.toLocaleString()} color="blue" />
                <StatCard
                    label="Snapshot"
                    value={`${data.snapshotEntryCount.toLocaleString()} kayıt`}
                    sub={`${snapshotAge} dk önce yüklendi`}
                    color="gray"
                />
                <StatCard label="Uptime" value={`${data.uptimeHours.toFixed(1)}s`} color="green" />
                <StatCard label="RAM Kullanım" value={`${data.ramUsageMb} MB`} color={data.ramUsageMb > 500 ? 'red' : 'gray'} />
            </div>
        </div>
    );
}
