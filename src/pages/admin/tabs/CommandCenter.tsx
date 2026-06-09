import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { metricsService } from '../../../services/metricsService';
import type { SystemHealthDto, Log, LogFilterDto } from '../../../types';
import { fmtTime } from '../../../utils/dateFormat';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import TurkeyMap from 'turkey-map-react';
import { useCapability } from '../../../hooks/useCapability';

interface KillSwitchData {
    mode: number;
    modeLabel: string;
    isActive: boolean;
    reason?: string | null;
    activatedAt?: string | null;
    updatedAt: string;
}

function formatUptime(hours: number): string {
    const days = Math.floor(hours / 24);
    const h = Math.floor(hours % 24);
    const m = Math.floor((hours * 60) % 60);
    if (days > 0) return `${days}g ${h}s ${m}dk`;
    return `${h}s ${m}dk`;
}

function ksLabelClass(mode: number): string {
    if (mode === 0) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (mode === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (mode === 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
}

function ksDotClass(mode: number): string {
    if (mode === 0) return 'bg-emerald-500';
    if (mode === 1) return 'bg-yellow-500';
    if (mode === 2) return 'bg-orange-500';
    return 'bg-red-500 animate-pulse';
}

function ksLabel(mode: number, label: string): string {
    if (mode === 0) return 'Devre Dışı';
    return label;
}

export default function CommandCenter() {
    const canView = useCapability('admin.system_monitor');
    const [systemHealth, setSystemHealth] = useState<SystemHealthDto | null>(null);
    const [killSwitch, setKillSwitch] = useState<KillSwitchData | null>(null);
    const [uptimeHours, setUptimeHours] = useState<number>(0);
    const [recentLogs, setRecentLogs] = useState<Log[]>([]);
    const [mapHoveredCity, setMapHoveredCity] = useState<any>(null);
    const [mapSelectedCity, setMapSelectedCity] = useState<any>(null);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await adminService.getSystemHealthStatus();
                if (res.data.success) setSystemHealth(res.data.data);
            } catch { /* sessiz geç */ }
        };

        const fetchMeta = async () => {
            try {
                const [ksRes, overviewRes] = await Promise.allSettled([
                    adminService.getKillSwitchState(),
                    metricsService.getOverview(),
                ]);
                if (ksRes.status === 'fulfilled' && (ksRes.value.data as any).success) {
                    setKillSwitch((ksRes.value.data as any).data);
                }
                if (overviewRes.status === 'fulfilled' && overviewRes.value.data.success) {
                    setUptimeHours(overviewRes.value.data.data.uptimeHours);
                }
            } catch { /* sessiz geç */ }
        };

        const fetchLogs = async () => {
            try {
                const filter: LogFilterDto = { page: 1, pageSize: 10, isActivityLog: false };
                const res = await adminService.getLogs(filter);
                if (res.data.success) setRecentLogs(res.data.data ?? []);
            } catch { /* sessiz geç */ }
        };

        fetchHealth();
        fetchMeta();
        fetchLogs();

        const healthInterval = setInterval(fetchHealth, 3000);
        const metaInterval = setInterval(fetchMeta, 60000);
        const logsInterval = setInterval(fetchLogs, 30000);

        return () => {
            clearInterval(healthInterval);
            clearInterval(metaInterval);
            clearInterval(logsInterval);
        };
    }, []);

    const errorRate = systemHealth && systemHealth.totalRequests > 0
        ? (systemHealth.totalErrors / systemHealth.totalRequests) * 100
        : 0;

    const ramPercent = systemHealth ? Math.min(100, (systemHealth.ramUsageMb / 1024) * 100) : 0;

    const responseTimeTrend = systemHealth?.trafficHistory?.map(p => ({
        timestamp: p.timestamp,
        responseTime: Math.round(p.responseTime),
        totalRequests: p.totalRequests,
    })) ?? [];

    const latencyColor = (ms: number) => {
        if (ms > 1000) return 'text-red-400';
        if (ms > 500) return 'text-orange-400';
        return 'text-white';
    };

    const errorRateTextColor = (rate: number) => {
        if (rate > 5) return 'text-red-400';
        if (rate > 2) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    const errorHealthLabel = (rate: number) => {
        if (rate > 5) return { text: 'Kritik', cls: 'bg-red-500 animate-pulse' };
        if (rate > 2) return { text: 'Uyarı', cls: 'bg-yellow-400' };
        return { text: 'Sağlıklı', cls: 'bg-emerald-500' };
    };

    const errorHealth = errorHealthLabel(errorRate);

    if (!systemHealth) {
        return (
            <div className="p-6 md:p-10 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
                    <p className="text-slate-500 font-medium">Sistem verileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!canView) return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;

    return (
        <div className="p-6 md:p-10 animate-fade-in space-y-8">
            {/* Başlık */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Canlı Radar</h1>
                    <p className="text-slate-500 text-sm mt-1">Sistem anlık izleme paneli.</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    CANLI — her 3s güncelleniyor
                </div>
            </div>

            {/* Bölüm 1: 5 Metric Kartı */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Aktif Kullanıcı */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-white shadow-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-2">Aktif Kullanıcı</span>
                    <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        <span className="text-4xl font-black">{systemHealth.activeUsers}</span>
                    </div>
                    <span className="text-xs text-slate-500 block mt-1.5">son 5 dakika</span>
                </div>

                {/* Toplam İstek */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-white shadow-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-2">Toplam İstek</span>
                    <span className="text-4xl font-black">{systemHealth.totalRequests.toLocaleString('tr-TR')}</span>
                    <span className="text-xs text-slate-500 block mt-1.5">{systemHealth.totalErrors} hata</span>
                </div>

                {/* Hata Oranı */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-white shadow-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-2">Hata Oranı</span>
                    <span className={`text-4xl font-black ${errorRateTextColor(errorRate)}`}>
                        {errorRate.toFixed(2)}%
                    </span>
                    <span className={`text-xs block mt-1.5 ${errorRateTextColor(errorRate)}`}>
                        {errorRate > 5 ? 'Kritik' : errorRate > 2 ? 'Uyarı' : 'Sağlıklı'}
                    </span>
                </div>

                {/* Gecikme */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-white shadow-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-2">Ort. Gecikme</span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${latencyColor(systemHealth.averageResponseTimeMs)}`}>
                            {Math.round(systemHealth.averageResponseTimeMs)}
                        </span>
                        <span className="text-sm text-slate-500">ms</span>
                    </div>
                    <span className="text-xs text-slate-500 block mt-1.5">
                        {systemHealth.averageResponseTimeMs > 1000 ? 'Yavaş' : systemHealth.averageResponseTimeMs > 500 ? 'Orta' : 'Hızlı'}
                    </span>
                </div>

                {/* RAM */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-white shadow-xl">
                    <span className="text-xs font-bold text-slate-400 block mb-2">RAM Kullanımı</span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${systemHealth.ramUsageMb > 500 ? 'text-red-400' : 'text-white'}`}>
                            {Math.round(systemHealth.ramUsageMb)}
                        </span>
                        <span className="text-sm text-slate-500">MB</span>
                    </div>
                    <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                ramPercent > 75 ? 'bg-red-500' : ramPercent > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${ramPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Bölüm 2: Harita + Sistem Durumu */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Türkiye Haritası (3/5) */}
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col relative overflow-hidden p-6 shadow-xl min-h-[420px]">
                    <h3 className="text-lg font-black text-white">Canlı Ağ Kaynakları (TR)</h3>
                    <p className="text-xs text-slate-500 mt-0.5 mb-2">Kırmızı: aktif sorun bulunan iller</p>
                    {(mapHoveredCity || mapSelectedCity) && (
                        <div className="absolute top-6 right-6 bg-slate-800 border border-slate-700 text-white rounded-xl shadow-2xl p-4 w-48 pointer-events-none z-10 animate-fade-in">
                            <h4 className="font-bold border-b border-slate-700 pb-2 mb-2 text-sm">
                                {(mapHoveredCity || mapSelectedCity).name}
                            </h4>
                            {(() => {
                                const density = systemHealth.turkeyMapData.find(
                                    c => c.cityCode == (mapHoveredCity || mapSelectedCity).plateNumber
                                );
                                return (
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Kullanıcı:</span>
                                            <span className="font-medium text-emerald-400">{density?.userCount || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Aktif Sorun:</span>
                                            <span className="font-medium text-red-400">{density?.problemCount || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Konumlu Sorun:</span>
                                            <span className="font-medium text-indigo-300">{density?.problemWithLocationCount || 0}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                    <div
                        className="flex-1 flex items-center justify-center mt-2"
                        onMouseLeave={() => setMapHoveredCity(null)}
                    >
                        <TurkeyMap
                            hoverable={true}
                            customStyle={{ idleColor: '#1e293b', hoverColor: '#4f46e5' }}
                            onClick={(city: any) =>
                                setMapSelectedCity(mapSelectedCity?.plateNumber === city.plateNumber ? null : city)
                            }
                            onHover={(city: any) => setMapHoveredCity(city)}
                            cityWrapper={(cityComponent: any, cityData: any) => {
                                const density = systemHealth.turkeyMapData.find(c => c.cityCode == cityData.plateNumber);
                                const hasProblems = density ? density.problemCount > 0 : false;
                                const isSelected = mapSelectedCity?.plateNumber === cityData.plateNumber;
                                const color = isSelected ? '#4f46e5' : hasProblems ? '#ef4444' : '#1e293b';
                                return React.cloneElement(cityComponent, {
                                    style: { fill: color, stroke: '#334155', outline: 'none', cursor: 'pointer', transition: 'fill 0.3s' },
                                });
                            }}
                        />
                    </div>
                </div>

                {/* Sistem Durumu Paneli (2/5) */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                    <h3 className="text-lg font-black text-white">Sistem Durumu</h3>

                    {/* Kill Switch */}
                    <div className="bg-slate-800 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Kill Switch</p>
                        {killSwitch ? (
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ksDotClass(killSwitch.mode)}`} />
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-black border ${ksLabelClass(killSwitch.mode)}`}>
                                    {ksLabel(killSwitch.mode, killSwitch.modeLabel)}
                                </span>
                                {killSwitch.isActive && killSwitch.reason && (
                                    <span className="text-xs text-slate-400 truncate max-w-[120px]" title={killSwitch.reason}>
                                        {killSwitch.reason}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <div className="w-3 h-3 rounded-full bg-slate-600 animate-pulse" />
                                Yükleniyor...
                            </div>
                        )}
                    </div>

                    {/* Uptime */}
                    <div className="bg-slate-800 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Uptime</p>
                            <p className="text-lg font-black text-white">{formatUptime(uptimeHours)}</p>
                        </div>
                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    {/* RAM Bar */}
                    <div className="bg-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">RAM</p>
                            <span className={`text-xs font-black ${systemHealth.ramUsageMb > 500 ? 'text-red-400' : 'text-slate-300'}`}>
                                {Math.round(systemHealth.ramUsageMb)} / 1024 MB
                            </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                    ramPercent > 75 ? 'bg-red-500' : ramPercent > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${ramPercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5">{ramPercent.toFixed(1)}% kullanımda</p>
                    </div>

                    {/* Hata Sağlığı */}
                    <div className="bg-slate-800 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Hata Sağlığı</p>
                            <p className={`text-base font-black ${errorRateTextColor(errorRate)}`}>{errorHealth.text}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{errorRate.toFixed(2)}% oran</p>
                        </div>
                        <span className={`w-5 h-5 rounded-full shrink-0 ${errorHealth.cls}`} />
                    </div>

                    {/* Aktif İstek Bilgisi */}
                    <div className="bg-slate-800 rounded-2xl p-4">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">İstek Özeti</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                                <p className="text-xl font-black text-white">{systemHealth.totalRequests.toLocaleString('tr-TR')}</p>
                                <p className="text-xs text-slate-500">Toplam</p>
                            </div>
                            <div className="text-center">
                                <p className={`text-xl font-black ${systemHealth.totalErrors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {systemHealth.totalErrors}
                                </p>
                                <p className="text-xs text-slate-500">Hata</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bölüm 3: 2 Grafik */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trafik Yükü */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col h-[280px]">
                    <h3 className="text-base font-black text-white mb-4">Trafik Yükü (Son Dakika)</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={systemHealth.trafficHistory}>
                                <defs>
                                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', color: '#fff' }}
                                    labelFormatter={() => ''}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalRequests"
                                    name="İstek"
                                    stroke="#6366f1"
                                    fillOpacity={1}
                                    fill="url(#colorTraffic)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Yanıt Süresi Trendi */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col h-[280px]">
                    <h3 className="text-base font-black text-white mb-4">Yanıt Süresi Trendi (ms)</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={responseTimeTrend}>
                                <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', color: '#fff' }}
                                    formatter={(v) => [`${v ?? 0}ms`, 'Yanıt Süresi']}
                                    labelFormatter={() => ''}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="responseTime"
                                    name="ms"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={{ r: 0 }}
                                    activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bölüm 4: Son Sistem Olayları */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">Son Sistem Olayları</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Her 30 saniyede güncellenir</p>
                    </div>
                    <Link
                        to="/admin/logs"
                        className="text-indigo-600 text-sm font-bold hover:text-indigo-800 transition-colors"
                    >
                        Tüm Loglar →
                    </Link>
                </div>

                {recentLogs.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-10">Log kaydı bulunamadı.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Zaman</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mesaj</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Seviye</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">
                                            {fmtTime(log.creationDate)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {log.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 max-w-xs">
                                            <span className="truncate block max-w-[320px]">{log.message}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                                log.level === 'Error'
                                                    ? 'bg-red-100 text-red-700'
                                                    : log.level === 'Warning'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {log.level}
                                            </span>
                                        </td>
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
