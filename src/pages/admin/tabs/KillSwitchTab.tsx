import { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { useCapability } from '../../../hooks/useCapability';

interface KillSwitchState {
    mode: number;
    modeLabel: string;
    isActive: boolean;
    reason?: string | null;
    activatedAt?: string | null;
    activatedByUserId?: number | null;
    updatedAt: string;
}

const MODE_CONFIG = {
    0: { label: 'Off',       color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    1: { label: 'Soft',      color: 'bg-amber-100 text-amber-800 border-amber-200',       dot: 'bg-amber-500'   },
    2: { label: 'Hard',      color: 'bg-orange-100 text-orange-800 border-orange-200',    dot: 'bg-orange-500'  },
    3: { label: 'Emergency', color: 'bg-red-100 text-red-800 border-red-200',             dot: 'bg-red-600'     },
} as const;

export default function KillSwitchTab() {
    const canRead      = useCapability('admin.killswitch_read');
    const canSoft      = useCapability('admin.killswitch_soft');
    const canHard      = useCapability('admin.killswitch_hard');
    const canEmergency = useCapability('admin.killswitch_emergency');

    const [state, setState] = useState<KillSwitchState | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [reason, setReason] = useState('');

    if (!canRead) return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;

    const load = async () => {
        setLoading(true);
        try {
            const res = await adminService.getKillSwitchState();
            if (res.data?.success) setState(res.data.data);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const activate = async (action: 'soft' | 'hard' | 'emergency' | 'deactivate') => {
        if (!reason.trim() && action !== 'deactivate') {
            alert('Gerekçe giriniz.');
            return;
        }
        setActionLoading(true);
        try {
            if (action === 'soft')        await adminService.setKillSwitchSoft(reason);
            else if (action === 'hard')   await adminService.setKillSwitchHard(reason);
            else if (action === 'emergency') await adminService.setKillSwitchEmergency(reason);
            else                          await adminService.deactivateKillSwitch(reason || 'Admin tarafından devre dışı bırakıldı');
            setReason('');
            await load();
        } catch {
            alert('İşlem sırasında hata oluştu.');
        } finally {
            setActionLoading(false);
        }
    };

    const modeConf = state ? (MODE_CONFIG[state.mode as keyof typeof MODE_CONFIG] ?? MODE_CONFIG[0]) : MODE_CONFIG[0];

    return (
        <div className="p-6 md:p-10 animate-fade-in max-w-3xl">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Kill Switch</h1>
                <p className="text-slate-500 text-sm mt-1">Workflow pipeline'ını durdurma ve acil durum kontrolleri.</p>
            </div>

            {/* Mevcut Durum */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Mevcut Durum</div>
                {loading ? (
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-indigo-500" />
                        <span className="text-sm text-slate-500">Yükleniyor...</span>
                    </div>
                ) : state ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black border ${modeConf.color}`}>
                                <span className={`w-2 h-2 rounded-full ${modeConf.dot} ${state.isActive ? 'animate-pulse' : ''}`} />
                                {modeConf.label}
                            </span>
                            {state.isActive && (
                                <span className="text-xs text-slate-500">
                                    {state.activatedAt && `${new Date(state.activatedAt).toLocaleString('tr-TR')} tarihinden beri aktif`}
                                </span>
                            )}
                        </div>
                        {state.reason && (
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-2">
                                <span className="font-bold">Gerekçe: </span>{state.reason}
                            </p>
                        )}
                        <p className="text-xs text-slate-400">
                            Son güncelleme: {new Date(state.updatedAt).toLocaleString('tr-TR')}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400">Durum alınamadı.</p>
                )}
            </div>

            {/* Mod Açıklamaları */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Mod Açıklamaları</div>
                <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                        <span className="w-24 shrink-0 font-black text-amber-700">Soft</span>
                        <span className="text-slate-600">Yeni workflow run'ları kabul edilmez; devam eden çalışmalar tamamlanır.</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="w-24 shrink-0 font-black text-orange-700">Hard</span>
                        <span className="text-slate-600">Worker'lar durdurulur; yeni NodeRun işlemleri başlatılmaz.</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="w-24 shrink-0 font-black text-red-700">Emergency</span>
                        <span className="text-slate-600">Tüm workflow altyapısı dondurulur. Geri alınabilir.</span>
                    </div>
                </div>
            </div>

            {/* Aksiyon Paneli */}
            {(canSoft || canHard || canEmergency) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">İşlem</div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Gerekçe</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Neden bu modu aktifleştiriyorsunuz?"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {canSoft && (
                            <button
                                onClick={() => activate('soft')}
                                disabled={actionLoading}
                                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition disabled:opacity-50 shadow-sm"
                            >
                                Soft Modu Aktifleştir
                            </button>
                        )}
                        {canHard && (
                            <button
                                onClick={() => activate('hard')}
                                disabled={actionLoading}
                                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition disabled:opacity-50 shadow-sm"
                            >
                                Hard Modu Aktifleştir
                            </button>
                        )}
                        {canEmergency && (
                            <button
                                onClick={() => activate('emergency')}
                                disabled={actionLoading}
                                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 shadow-sm"
                            >
                                Emergency Modu Aktifleştir
                            </button>
                        )}
                        {canSoft && state?.isActive && (
                            <button
                                onClick={() => activate('deactivate')}
                                disabled={actionLoading}
                                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
                            >
                                Devre Dışı Bırak
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
