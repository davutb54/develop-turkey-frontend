import { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import type { SystemSettings } from '../../../types';
import { useCapability } from '../../../hooks/useCapability';

const EMPTY_SETTINGS: SystemSettings = {
    id: 0,
    isMaintenanceMode: false,
    disableNewRegistrations: false,
    maintenanceMessage: '',
    siteName: '',
    siteDescription: '',
    organizationName: '',
    contactFullName: '',
    contactAddress: '',
    contactEmail: '',
    contactPhone: '',
    socialTwitter: '',
    socialInstagram: '',
    socialLinkedIn: '',
};

export default function SettingsTab() {
    const canWrite = useCapability('admin.system_settings_write');
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(EMPTY_SETTINGS);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await adminService.getSystemSettings();
                if (res.data.success) setSystemSettings(res.data.data);
            } catch (err) {
                console.error('Ayarlar yüklenemedi', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleUpdateSystemSettings = async () => {
        setSettingsLoading(true);
        setSaveStatus(null);
        try {
            const res = await adminService.updateSystemSettings(systemSettings);
            if (res.data.success) {
                setSaveStatus({ type: 'success', message: 'Sistem ayarları başarıyla güncellendi!' });
                setTimeout(() => setSaveStatus(null), 3000);
            } else {
                setSaveStatus({ type: 'error', message: res.data.message || 'Bir hata oluştu.' });
            }
        } catch (err: any) {
            setSaveStatus({ type: 'error', message: err.response?.data?.message || 'İşlem başarısız oldu.' });
        } finally {
            setSettingsLoading(false);
        }
    };

    const set = (patch: Partial<SystemSettings>) => setSystemSettings(prev => ({ ...prev, ...patch }));

    if (loading) return (
        <div className="p-10 flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600" />
        </div>
    );

    return (
        <div className="p-6 md:p-10 animate-fade-in space-y-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sistem Parametreleri</h1>
                    <p className="text-slate-500 font-medium">Platformun çalışma modlarını ve üyelik politikalarını buradan yönetin.</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl text-xs font-bold border border-indigo-100 flex items-center gap-2">
                    Güvenli Alan
                </div>
            </div>

            {saveStatus && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${saveStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                        {saveStatus.type === 'success' ? '✓' : '!'}
                    </div>
                    <span className="font-bold">{saveStatus.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Maintenance Mode */}
                <div className="bg-white border-2 border-slate-50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 group">
                    <div className="flex items-start justify-between mb-6">
                        <div className="p-4 bg-amber-50 rounded-3xl text-amber-600 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={systemSettings.isMaintenanceMode}
                                onChange={e => set({ isMaintenanceMode: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="relative w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-2">Bakım Modu (Under Construction)</h4>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">Aktif edildiğinde sadece yöneticiler işlem yapabilir, kullanıcılar bilgilendirme sayfasına yönlendirilir.</p>
                </div>

                {/* Disable Registrations */}
                <div className="bg-white border-2 border-slate-50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 group">
                    <div className="flex items-start justify-between mb-6">
                        <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={systemSettings.disableNewRegistrations}
                                onChange={e => set({ disableNewRegistrations: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="relative w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-2">Yeni Üye Alımını Durdur</h4>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">Aktif olduğunda kayıt formu devre dışı kalır ve kimse yeni hesap oluşturamaz.</p>
                </div>
            </div>

            {/* Maintenance message (shown only when enabled) */}
            {systemSettings.isMaintenanceMode && (
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-all duration-500">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                        </svg>
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h4 className="text-lg font-bold text-amber-400">Bakım Modu Mesajı</h4>
                        <p className="text-slate-400 text-sm">Kullanıcıların yönlendirildikleri sayfada görecekleri mesaj:</p>
                        <textarea
                            value={systemSettings.maintenanceMessage || ''}
                            onChange={e => set({ maintenanceMessage: e.target.value })}
                            placeholder="Sistem şu anda bakım aşamasındadır..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-lg font-medium outline-none focus:ring-2 focus:ring-amber-500 transition-all min-h-[120px]"
                        />
                    </div>
                </div>
            )}

            {/* Contact & site info */}
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-all duration-500">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                </div>
                <div className="relative z-10 space-y-8">
                    <div>
                        <h4 className="text-lg font-bold text-indigo-400 mb-1">İletişim ve Site Bilgileri</h4>
                        <p className="text-slate-400 text-sm">Footer ve iletişim sayfasında görüntülenecek bilgiler.</p>
                    </div>

                    {/* Site identity */}
                    <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">🌐 Site Kimliği</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">Site Adı</label>
                                <input type="text" value={systemSettings.siteName || ''} onChange={e => set({ siteName: e.target.value })} placeholder="Develop Turkey" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">Kurum Adı (Footer Yazısı)</label>
                                <input type="text" value={systemSettings.organizationName || ''} onChange={e => set({ organizationName: e.target.value })} placeholder="Vatandaşlarımızın sorunlarını..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400">Site Açıklaması (Slogan)</label>
                                <textarea value={systemSettings.siteDescription || ''} onChange={e => set({ siteDescription: e.target.value })} placeholder="Kısa site açıklaması" rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500 resize-none" />
                            </div>
                        </div>
                    </div>

                    {/* Contact info */}
                    <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">📬 İletişim Bilgileri</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">Ad Soyad</label>
                                <input type="text" value={systemSettings.contactFullName || ''} onChange={e => set({ contactFullName: e.target.value })} placeholder="Ad Soyad" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">E-posta</label>
                                <input type="email" value={systemSettings.contactEmail || ''} onChange={e => set({ contactEmail: e.target.value })} placeholder="iletisim@site.com" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">Telefon</label>
                                <input type="tel" value={systemSettings.contactPhone || ''} onChange={e => set({ contactPhone: e.target.value })} placeholder="+90 5XX XXX XX XX" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400">Açık Adres</label>
                                <textarea value={systemSettings.contactAddress || ''} onChange={e => set({ contactAddress: e.target.value })} placeholder="Açık adres" rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500 resize-none" />
                            </div>
                        </div>
                    </div>

                    {/* Social media */}
                    <div className="space-y-4">
                        <h5 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">📲 Sosyal Medya</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">Twitter / X</label>
                                <input type="url" value={systemSettings.socialTwitter || ''} onChange={e => set({ socialTwitter: e.target.value })} placeholder="https://twitter.com/..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">Instagram</label>
                                <input type="url" value={systemSettings.socialInstagram || ''} onChange={e => set({ socialInstagram: e.target.value })} placeholder="https://instagram.com/..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">LinkedIn</label>
                                <input type="url" value={systemSettings.socialLinkedIn || ''} onChange={e => set({ socialLinkedIn: e.target.value })} placeholder="https://linkedin.com/..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder-slate-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save / cancel */}
            <div className="flex items-center justify-end gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                >
                    Değişiklikleri İptal Et
                </button>
                {canWrite && <button
                    onClick={handleUpdateSystemSettings}
                    disabled={settingsLoading}
                    className={`px-12 py-4 rounded-2xl font-black text-white shadow-2xl transition-all active:scale-95 flex items-center gap-3 ${settingsLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}
                >
                    {settingsLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            Güncelleniyor...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Parametreleri Kaydet
                        </>
                    )}
                </button>}
            </div>
        </div>
    );
}
