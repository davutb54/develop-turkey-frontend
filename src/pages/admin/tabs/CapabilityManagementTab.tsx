import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { capabilityService, type CapabilityDto, type UserCapabilityDto } from '../../../services/capabilityService';
import { userService } from '../../../services/userService';
import { useCapability } from '../../../hooks/useCapability';
import type { UserDetailDto } from '../../../types';

const CATEGORY_LABELS: Record<string, string> = {
    admin: 'Yönetim',
    moderation: 'Moderasyon',
    expert: 'Uzman',
    user: 'Kullanıcı',
    'workflow.action': 'Workflow Action',
};

const STATUS_LABELS: Record<number, string> = {
    1: 'Aktif',
    2: 'İptal',
};

export default function CapabilityManagementTab() {
    const canGrant  = useCapability('admin.capability_grant');
    const canRevoke = useCapability('admin.capability_revoke');
    const canRead   = useCapability('admin.capability_catalog_read');

    // Katalog
    const [catalog, setCatalog] = useState<CapabilityDto[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);

    // Kullanıcı arama
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState<UserDetailDto[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDetailDto | null>(null);

    // Seçili kullanıcının capability'leri
    const [userCaps, setUserCaps] = useState<UserCapabilityDto[]>([]);
    const [capsLoading, setCapsLoading] = useState(false);
    const [includeExpired, setIncludeExpired] = useState(false);

    // Grant formu
    const [grantCode, setGrantCode] = useState('');
    const [grantSearch, setGrantSearch] = useState('');
    const [grantInstitutionId, setGrantInstitutionId] = useState('');
    const [grantExpiresAt, setGrantExpiresAt] = useState('');
    const [grantReason, setGrantReason] = useState('');
    const [grantLoading, setGrantLoading] = useState(false);

    // Revoke
    const [revokeLoading, setRevokeLoading] = useState<number | null>(null);

    // Kategori filtresi (katalogda)
    const categories = Array.from(new Set(catalog.map(c => c.category ?? 'Diğer')));
    const grouped = categories.reduce((acc, cat) => {
        acc[cat] = catalog.filter(c => (c.category ?? 'Diğer') === cat);
        return acc;
    }, {} as Record<string, CapabilityDto[]>);

    useEffect(() => {
        if (!canRead) return;
        setCatalogLoading(true);
        capabilityService.getAll()
            .then(res => { if (res.data.success) setCatalog(res.data.data); })
            .catch(() => {})
            .finally(() => setCatalogLoading(false));
    }, [canRead]);

    // Kullanıcı arama (debounce)
    useEffect(() => {
        if (userSearch.length < 2) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await userService.getAllPaged({ searchText: userSearch, pageSize: 8 });
                if (res.data.success) setSearchResults(res.data.data.items ?? res.data.data);
            } catch { setSearchResults([]); }
            finally { setSearchLoading(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [userSearch]);

    const loadUserCaps = async (user: UserDetailDto) => {
        setSelectedUser(user);
        setUserSearch('');
        setSearchResults([]);
        setCapsLoading(true);
        try {
            const res = await capabilityService.getByUser(user.id, includeExpired);
            if (res.data.success) setUserCaps(res.data.data);
        } catch { setUserCaps([]); }
        finally { setCapsLoading(false); }
    };

    const reloadCaps = async () => {
        if (!selectedUser) return;
        setCapsLoading(true);
        try {
            const res = await capabilityService.getByUser(selectedUser.id, includeExpired);
            if (res.data.success) setUserCaps(res.data.data);
        } catch { }
        finally { setCapsLoading(false); }
    };

    useEffect(() => { if (selectedUser) reloadCaps(); }, [includeExpired]);

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !grantCode || !grantReason.trim()) return;
        setGrantLoading(true);
        try {
            const res = await capabilityService.grant(selectedUser.id, {
                capabilityCode: grantCode,
                institutionId: grantInstitutionId ? parseInt(grantInstitutionId) : undefined,
                expiresAt: grantExpiresAt || undefined,
                reason: grantReason,
            });
            if (res.data.success) {
                setGrantCode('');
                setGrantInstitutionId('');
                setGrantExpiresAt('');
                setGrantReason('');
                reloadCaps();
            } else {
                alert(res.data.message || 'Grant başarısız.');
            }
        } catch {
            alert('İşlem sırasında hata oluştu.');
        } finally {
            setGrantLoading(false);
        }
    };

    const handleRevoke = async (cap: UserCapabilityDto) => {
        if (!selectedUser) return;
        if (!window.confirm(`"${cap.capabilityCode}" yetkisini kaldırmak istediğinize emin misiniz?`)) return;
        setRevokeLoading(cap.id);
        try {
            const res = await capabilityService.revoke(selectedUser.id, {
                capabilityCode: cap.capabilityCode,
                institutionId: cap.institutionId,
                reason: 'Admin tarafından manuel revoke',
            });
            if (res.data.success) {
                reloadCaps();
            } else {
                alert(res.data.message || 'Revoke başarısız.');
            }
        } catch {
            alert('İşlem sırasında hata oluştu.');
        } finally {
            setRevokeLoading(null);
        }
    };

    if (!canRead) {
        return (
            <div className="p-10 text-center text-slate-500">
                Bu sayfayı görüntüleme yetkiniz yok.
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Yetki Yönetimi</h1>
                <p className="text-slate-500 text-sm mt-1">Kullanıcılara capability (yetki) ekleyin veya kaldırın.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* SOL — Kullanıcı seçimi + capability listesi */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Kullanıcı arama */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Kullanıcı Ara</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Kullanıcı adı veya e-posta ara..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            {searchLoading && (
                                <div className="absolute right-3 top-3.5">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-indigo-500" />
                                </div>
                            )}
                            {searchResults.length > 0 && (
                                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                                    {searchResults.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => loadUserCaps(u)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-left transition"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                                                {(u.name?.[0] ?? u.userName?.[0] ?? '?').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800 text-sm">@{u.userName}</div>
                                                <div className="text-xs text-slate-400">{u.email}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Seçili kullanıcı */}
                    {selectedUser && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                                        {(selectedUser.name?.[0] ?? selectedUser.userName?.[0] ?? '?').toUpperCase()}
                                    </div>
                                    <div>
                                        <Link to={`/user/${selectedUser.id}`} target="_blank"
                                            className="font-black text-slate-800 hover:text-indigo-600 transition">
                                            @{selectedUser.userName}
                                        </Link>
                                        <div className="text-xs text-slate-400">{selectedUser.email}</div>
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={includeExpired}
                                        onChange={e => setIncludeExpired(e.target.checked)}
                                        className="rounded"
                                    />
                                    Süre dolmuşları göster
                                </label>
                            </div>

                            {capsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-indigo-500" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm divide-y divide-slate-100">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetki Kodu</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapsam</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Süre</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {userCaps.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-10 text-slate-400">
                                                        Hiç yetki kaydı bulunamadı.
                                                    </td>
                                                </tr>
                                            ) : userCaps.map(cap => (
                                                <tr key={cap.id} className={`hover:bg-slate-50 transition ${cap.status !== 1 ? 'opacity-50' : ''}`}>
                                                    <td className="px-5 py-3">
                                                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                                            {cap.capabilityCode}
                                                        </span>
                                                        {cap.reason && (
                                                            <div className="text-[10px] text-slate-400 mt-0.5">{cap.reason}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="text-xs text-slate-500">
                                                            {CATEGORY_LABELS[cap.category ?? ''] ?? cap.category ?? '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-xs text-slate-500">
                                                        {cap.institutionId ? `Kurum #${cap.institutionId}` : 'Global'}
                                                    </td>
                                                    <td className="px-5 py-3 text-xs text-slate-500">
                                                        {cap.expiresAt
                                                            ? new Date(cap.expiresAt).toLocaleDateString('tr-TR')
                                                            : '—'}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                                            cap.status === 1
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                            {STATUS_LABELS[cap.status] ?? 'Bilinmiyor'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        {canRevoke && cap.status === 1 && (
                                                            <button
                                                                onClick={() => handleRevoke(cap)}
                                                                disabled={revokeLoading === cap.id}
                                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 transition shadow-sm disabled:opacity-50"
                                                            >
                                                                {revokeLoading === cap.id ? '...' : 'Kaldır'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {!selectedUser && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <p className="text-sm font-medium">Bir kullanıcı arayın ve seçin</p>
                        </div>
                    )}
                </div>

                {/* SAĞ — Grant formu */}
                <div className="space-y-4">
                    {canGrant && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h2 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">Yetki Ekle</h2>
                            {!selectedUser ? (
                                <p className="text-xs text-slate-400 italic">Önce sol taraftan bir kullanıcı seçin.</p>
                            ) : (
                                <form onSubmit={handleGrant} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Yetki Kodu *</label>
                                        {catalogLoading ? (
                                            <div className="text-xs text-slate-400">Katalog yükleniyor...</div>
                                        ) : (
                                            <>
                                                <div className="relative mb-1.5">
                                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <input
                                                        type="text"
                                                        placeholder="Yetki ara..."
                                                        value={grantSearch}
                                                        onChange={e => setGrantSearch(e.target.value)}
                                                        className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                    {grantSearch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setGrantSearch('')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <select
                                                    value={grantCode}
                                                    onChange={e => setGrantCode(e.target.value)}
                                                    required
                                                    size={grantSearch ? Math.min(8, catalog.filter(c => c.isActive && c.code.toLowerCase().includes(grantSearch.toLowerCase())).length + 1) : undefined}
                                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                >
                                                    <option value="">-- Seçin --</option>
                                                    {grantSearch ? (
                                                        catalog
                                                            .filter(c => c.isActive && c.code.toLowerCase().includes(grantSearch.toLowerCase()))
                                                            .map(c => (
                                                                <option key={c.code} value={c.code}>{c.code}</option>
                                                            ))
                                                    ) : (
                                                        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, caps]) => (
                                                            <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                                                                {caps.filter(c => c.isActive).map(c => (
                                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                                ))}
                                                            </optgroup>
                                                        ))
                                                    )}
                                                </select>
                                            </>
                                        )}
                                        {grantCode && (
                                            <div className="mt-1 text-[11px] text-slate-400">
                                                {catalog.find(c => c.code === grantCode)?.description}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kurum ID (opsiyonel)</label>
                                        <input
                                            type="number"
                                            placeholder="Institution kapsamı için"
                                            value={grantInstitutionId}
                                            onChange={e => setGrantInstitutionId(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Son Kullanma Tarihi (opsiyonel)</label>
                                        <input
                                            type="datetime-local"
                                            value={grantExpiresAt}
                                            onChange={e => setGrantExpiresAt(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Gerekçe *</label>
                                        <input
                                            type="text"
                                            placeholder="Grant gerekçesi"
                                            value={grantReason}
                                            onChange={e => setGrantReason(e.target.value)}
                                            required
                                            minLength={3}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={grantLoading || !grantCode || !grantReason.trim()}
                                        className="w-full py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
                                    >
                                        {grantLoading ? 'Ekleniyor...' : 'Yetki Ekle'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Katalog özeti */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <h2 className="text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">Katalog Özeti</h2>
                        {catalogLoading ? (
                            <div className="text-xs text-slate-400">Yükleniyor...</div>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, caps]) => (
                                    <div key={cat} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 font-medium">{CATEGORY_LABELS[cat] ?? cat}</span>
                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{caps.length}</span>
                                    </div>
                                ))}
                                <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-sm font-black">
                                    <span className="text-slate-700">Toplam</span>
                                    <span className="text-indigo-700">{catalog.length}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
