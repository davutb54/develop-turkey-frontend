import React, { useState, useEffect, useRef } from 'react';
import WysiwygEditor from './WysiwygEditor';
import { adminService } from '../services/adminService';
import type { LegalAgreement } from '../types';
import { useAuth } from '../context/AuthContext';

// ─── Tipler ──────────────────────────────────────────────────────────────────
interface AgreementStats {
    agreementId: number;
    acceptanceCount: number;
    acceptanceRate: number;
}

// ─── Sabit etiketler ─────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
    { value: 'TermsOfService', label: 'Kullanım Koşulları' },
    { value: 'PrivacyPolicy', label: 'Gizlilik Politikası' },
    { value: 'KVKK', label: 'KVKK Aydınlatma' },
];
const typeLabel = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.label ?? t;

// ─── İstatistik Popover ───────────────────────────────────────────────────────
const StatsPopover = ({ agreementId }: { agreementId: number }) => {
    const [open, setOpen] = useState(false);
    const [stats, setStats] = useState<AgreementStats | null>(null);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const handleOpen = async () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        setLoading(true);
        try {
            const res = await adminService.getAgreementStats(agreementId);
            setStats(res.data);
        } catch {
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    // Dışarı tıklayınca kapat
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                onClick={handleOpen}
                title="İstatistik"
                className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </button>
            {open && (
                <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-56 animate-fade-in">
                    {loading ? (
                        <div className="flex justify-center py-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-indigo-500" />
                        </div>
                    ) : stats ? (
                        <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">📊 Kabul İstatistiği</p>
                            <p className="text-sm font-bold text-slate-700">
                                <span className="text-2xl font-black text-indigo-600">{stats.acceptanceCount}</span> kullanıcı onayladı
                            </p>
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Onay Oranı</span>
                                    <span className="font-bold text-emerald-600">%{stats.acceptanceRate.toFixed(1)}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(stats.acceptanceRate, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-1">Veri alınamadı.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
const AgreementsTab: React.FC = () => {
    const { userId } = useAuth();

    // Liste
    const [agreements, setAgreements] = useState<LegalAgreement[]>([]);
    const [listLoading, setListLoading] = useState(false);

    // Geçmiş modal
    const [historyType, setHistoryType] = useState<string | null>(null);

    // Form
    const [formTitle, setFormTitle] = useState('');
    const [formType, setFormType] = useState('TermsOfService');
    const [formVersion, setFormVersion] = useState('');
    const [formMajor, setFormMajor] = useState(false);
    const [formContent, setFormContent] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const fetchAgreements = async () => {
        setListLoading(true);
        try {
            const res = await adminService.getAgreements();
            if (res.data.success) setAgreements(res.data.data);
        } catch { /* sessiz */ }
        finally { setListLoading(false); }
    };

    useEffect(() => { fetchAgreements(); }, []);

    const handleActivate = async (id: number) => {
        if (!window.confirm('Bu sözleşme versiyonunu aktif yapmak istediğinize emin misiniz? Aynı tipteki diğer aktif sözleşmeler pasife alınacaktır.')) return;
        try {
            await adminService.activateAgreement(id);
            fetchAgreements();
        } catch { alert('Aktifleştirme başarısız.'); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Bu sözleşmeyi silmek istediğinize emin misiniz?')) return;
        try {
            await adminService.deleteAgreement(id);
            fetchAgreements();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Silme işlemi başarısız.');
        }
    };

    const resetForm = () => {
        setFormTitle(''); setFormType('TermsOfService'); setFormVersion('');
        setFormMajor(false); setFormContent(''); setFormError(''); setFormSuccess('');
    };

    const handleSave = async (andActivate: boolean) => {
        setFormError(''); setFormSuccess('');
        if (!formTitle.trim() || !formVersion.trim() || !formContent.trim()) {
            setFormError('Başlık, versiyon ve içerik zorunludur.'); return;
        }
        setFormLoading(true);
        try {
            const res = await adminService.createAgreement({
                title: formTitle,
                type: formType,
                version: formVersion,
                content: formContent,
                isMajorVersion: formMajor,
                publishedByAdminId: userId as number,
            });
            const newId = res.data?.data?.id ?? res.data?.id;
            if (andActivate && newId) {
                await adminService.activateAgreement(newId);
            }
            setFormSuccess(andActivate ? 'Sözleşme oluşturuldu ve aktif yapıldı!' : 'Sözleşme taslak olarak kaydedildi.');
            resetForm();
            fetchAgreements();
        } catch (err: any) {
            setFormError(err?.response?.data?.message || 'İşlem başarısız oldu.');
        } finally {
            setFormLoading(false);
        }
    };

    // Geçmiş modal: aynı Type'taki tüm versiyonlar
    const historyAgreements = historyType
        ? agreements.filter(a => a.type === historyType)
        : [];

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📜</span>
                <div>
                    <h2 className="text-xl font-black text-slate-800">Sözleşme Yönetimi</h2>
                    <p className="text-sm text-slate-500">Kullanım Koşulları, Gizlilik Politikası ve KVKK belgelerini yönetin.</p>
                </div>
            </div>

            {/* ── SÖZLEŞME LİSTESİ ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider">Tüm Sözleşmeler</h3>
                    <span className="text-xs text-slate-400 font-medium">{agreements.length} kayıt</span>
                </div>

                {listLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
                    </div>
                ) : agreements.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium">Henüz sözleşme oluşturulmamış.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Başlık</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Tip</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Versiyon</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Major?</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Durum</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Tarih</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {agreements.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-700">{a.title}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {typeLabel(a.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-600">v{a.version}</td>
                                        <td className="px-4 py-3 text-center">
                                            {a.isMajorVersion ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700">
                                                    ⚡ Köklü
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {a.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">
                                                    Pasif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {new Date(a.publishedAt).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* İstatistik popover */}
                                                <StatsPopover agreementId={a.id} />

                                                {/* Geçmişi Gör */}
                                                <button
                                                    onClick={() => setHistoryType(a.type)}
                                                    title="Versiyon Geçmişi"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>

                                                {/* Aktif Yap */}
                                                <button
                                                    onClick={() => handleActivate(a.id)}
                                                    disabled={a.isActive}
                                                    title={a.isActive ? 'Zaten aktif' : 'Aktif Yap'}
                                                    className={`p-1.5 rounded-lg transition ${a.isActive
                                                        ? 'text-slate-200 cursor-not-allowed'
                                                        : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
                                                        }`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>

                                                {/* Sil */}
                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    disabled={a.isActive}
                                                    title={a.isActive ? 'Aktif sözleşme silinemez' : 'Sil'}
                                                    className={`p-1.5 rounded-lg transition ${a.isActive
                                                        ? 'text-slate-200 cursor-not-allowed'
                                                        : 'text-red-400 hover:bg-red-50 hover:text-red-600'
                                                        }`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── YENİ SÖZLEŞME FORMU ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-black text-slate-700 text-sm uppercase tracking-wider">✍️ Yeni Sözleşme Oluştur</h3>
                </div>
                <div className="p-6 space-y-5">
                    {/* Başlık + Tip + Versiyon */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Başlık</label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                placeholder="örn. Kullanım Koşulları"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Tip</label>
                            <select
                                value={formType}
                                onChange={e => setFormType(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                            >
                                {TYPE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">Versiyon</label>
                            <input
                                type="text"
                                value={formVersion}
                                onChange={e => setFormVersion(e.target.value)}
                                placeholder="1.0"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
                            />
                        </div>
                    </div>

                    {/* Major toggle */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer w-fit">
                            <div
                                onClick={() => setFormMajor(p => !p)}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${formMajor ? 'bg-orange-500' : 'bg-slate-200'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${formMajor ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className="text-sm font-bold text-slate-700">Bu köklü bir değişikliktir</span>
                        </label>
                        {formMajor && (
                            <div className="mt-3 flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                                <span className="text-orange-500 text-lg shrink-0">⚡</span>
                                <p className="text-xs text-orange-700 font-semibold leading-5">
                                    <strong>Dikkat:</strong> Bu versiyon aktif yapıldığında, siteye giriş yapan tüm mevcut kullanıcılar bu sözleşmeyi yeniden onaylamak zorunda kalacaktır. İşlem geri alınamaz.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* WYSIWYG Editör */}
                    <div>
                        <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-1.5">
                            İçerik
                        </label>
                        <WysiwygEditor
                            value={formContent}
                            onChange={setFormContent}
                            height={380}
                            placeholder="Sözleşme metnini buraya yazın..."
                        />
                    </div>

                    {/* Mesajlar */}
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-xl">
                            ⚠️ {formError}
                        </div>
                    )}
                    {formSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-3 rounded-xl">
                            ✅ {formSuccess}
                        </div>
                    )}

                    {/* Butonlar */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => handleSave(false)}
                            disabled={formLoading}
                            className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50 active:scale-95"
                        >
                            {formLoading ? 'Kaydediliyor...' : '💾 Kaydet (Taslak)'}
                        </button>
                        <button
                            onClick={() => handleSave(true)}
                            disabled={formLoading}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition disabled:opacity-50 active:scale-95"
                        >
                            {formLoading ? 'İşleniyor...' : '🚀 Kaydet ve Aktif Yap'}
                        </button>
                        <button
                            onClick={resetForm}
                            disabled={formLoading}
                            className="ml-auto px-4 py-2.5 rounded-xl text-slate-400 text-sm font-bold hover:text-slate-700 transition"
                        >
                            Temizle
                        </button>
                    </div>
                </div>
            </div>

            {/* ── VERSİYON GEÇMİŞİ MODAL ── */}
            {historyType && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-800">
                                📋 {typeLabel(historyType)} — Versiyon Geçmişi
                            </h3>
                            <button
                                onClick={() => setHistoryType(null)}
                                className="text-slate-400 hover:text-slate-700 transition text-xl leading-none"
                            >✕</button>
                        </div>
                        <div className="overflow-y-auto p-6 space-y-3">
                            {historyAgreements.length === 0 ? (
                                <p className="text-center text-slate-400 py-8">Bu tipe ait sözleşme bulunamadı.</p>
                            ) : (
                                historyAgreements
                                    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                                    .map(a => (
                                        <div
                                            key={a.id}
                                            className={`flex items-center gap-4 p-4 rounded-xl border ${a.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-700 text-sm">{a.title}</span>
                                                    <span className="font-mono text-xs text-slate-500">v{a.version}</span>
                                                    {a.isActive && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">Aktif</span>
                                                    )}
                                                    {a.isMajorVersion && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700">⚡ Köklü</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {new Date(a.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <StatsPopover agreementId={a.id} />
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgreementsTab;
