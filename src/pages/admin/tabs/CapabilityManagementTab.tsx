import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    capabilityService,
    type CapabilityDto,
    type UserCapabilityDto,
    type RevokeBulkDto,
} from '../../../services/capabilityService';
import { userService } from '../../../services/userService';
import { institutionService } from '../../../services/institutionService';
import { useCapability } from '../../../hooks/useCapability';
import type { UserDetailDto } from '../../../types';

interface InstitutionDto { id: number; name: string; domain: string; status: boolean; }

// GroupKey etiketleri — okunabilir gruplar için
const GROUP_LABELS: Record<string, string> = {
    'admin.system': 'Sistem',
    'admin.users': 'Kullanıcı Yönetimi',
    'admin.institutions': 'Kurum Yönetimi',
    'admin.audit': 'Denetim',
    'admin.features': 'Özellikler',
    'admin.content': 'İçerik Yönetimi',
    'admin.workflow': 'Workflow',
    'admin.capabilities': 'Yetki Yönetimi',
    'admin.announcements': 'Duyurular',
    'admin.tenancy': 'Çok-Kiracı',
    'admin.killswitch': 'Kill Switch',
    'admin.metrics': 'Metrikler',
    'moderation.content': 'İçerik İnceleme',
    'moderation.problems': 'Problem Moderasyonu',
    'moderation.solutions': 'Çözüm Moderasyonu',
    'moderation.comments': 'Yorum Moderasyonu',
    'moderation.users': 'Kullanıcı Uyarıları',
    'moderation.reports': 'Raporlar',
    'moderation.topics': 'Kategoriler',
    'moderation.notifications': 'Bildirimler',
    'moderation.audit': 'Moderasyon Denetimi',
    'expert.solutions': 'Çözüm Uzmanı',
    'expert.problems': 'Problem Uzmanı',
    'expert.content': 'İçerik Vurgulama',
    'expert.badges': 'Rozetler',
    'expert.workflow': 'Workflow Uzmanı',
    'expert.csharp': 'C# Sandbox',
    'user.problems': 'Problem İşlemleri',
    'user.solutions': 'Çözüm İşlemleri',
    'user.comments': 'Yorum İşlemleri',
    'user.voting': 'Oylama',
    'user.social': 'Sosyal',
    'user.reporting': 'Raporlama',
    'user.profile': 'Profil',
    'user.account': 'Hesap',
    'workflow.action': 'Workflow Action',
    'page.admin': 'Admin Sayfa Erişimleri',
};

const STATUS_LABELS: Record<number, string> = { 1: 'Aktif', 2: 'İptal' };

export default function CapabilityManagementTab() {
    const canGrant  = useCapability('admin.capability_grant');
    const canRevoke = useCapability('admin.capability_revoke');
    const canRead   = useCapability('admin.capability_catalog_read');

    const [catalog, setCatalog] = useState<CapabilityDto[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);

    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState<UserDetailDto[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDetailDto | null>(null);

    const [userCaps, setUserCaps] = useState<UserCapabilityDto[]>([]);
    const [capsLoading, setCapsLoading] = useState(false);
    const [includeExpired, setIncludeExpired] = useState(false);

    // Bulk revoke
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkRevokeReason, setBulkRevokeReason] = useState('');
    const [bulkRevokeLoading, setBulkRevokeLoading] = useState(false);
    const [showBulkDialog, setShowBulkDialog] = useState(false);

    const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);

    // Grant formu
    const [grantCode, setGrantCode] = useState('');
    const [grantSearch, setGrantSearch] = useState('');
    const [grantInstitutionId, setGrantInstitutionId] = useState('');
    const [grantExpiresAt, setGrantExpiresAt] = useState('');
    const [grantReason, setGrantReason] = useState('');
    const [grantLoading, setGrantLoading] = useState(false);

    const [revokeLoading, setRevokeLoading] = useState<number | null>(null);

    // Mevcut yetki listesi filtreleri
    const [capFilter, setCapFilter]           = useState('');
    const [capGroupFilter, setCapGroupFilter] = useState('');
    const [capScopeFilter, setCapScopeFilter] = useState<'all' | 'Page' | 'Action'>('all');

    // GroupKey bazlı gruplama (katalog için)
    const groupKeys = Array.from(new Set(catalog.map(c => c.groupKey ?? c.category ?? 'Diğer')));
    const grouped = groupKeys.reduce((acc, key) => {
        acc[key] = catalog.filter(c => (c.groupKey ?? c.category ?? 'Diğer') === key);
        return acc;
    }, {} as Record<string, CapabilityDto[]>);

    useEffect(() => {
        if (!canRead) return;
        setCatalogLoading(true);
        Promise.all([
            capabilityService.getAll(),
            institutionService.getAll(),
        ]).then(([capRes, instRes]) => {
            if (capRes.data.success) setCatalog(capRes.data.data);
            const data = instRes.data?.data ?? instRes.data;
            if (Array.isArray(data)) setInstitutions(data);
        }).catch(() => {}).finally(() => setCatalogLoading(false));
    }, [canRead]);

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
        setSelectedIds(new Set());
        setCapFilter('');
        setCapGroupFilter('');
        setCapScopeFilter('all');
        setCapsLoading(true);
        try {
            const res = await capabilityService.getByUser(user.id, includeExpired);
            if (res.data.success) setUserCaps(res.data.data);
        } catch { setUserCaps([]); }
        finally { setCapsLoading(false); }
    };

    const reloadCaps = async () => {
        if (!selectedUser) return;
        setSelectedIds(new Set());
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
                setGrantCode(''); setGrantInstitutionId(''); setGrantExpiresAt(''); setGrantReason('');
                reloadCaps();
            } else {
                alert(res.data.message || 'Grant başarısız.');
            }
        } catch { alert('İşlem sırasında hata oluştu.'); }
        finally { setGrantLoading(false); }
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
            if (res.data.success) reloadCaps();
            else alert(res.data.message || 'Revoke başarısız.');
        } catch { alert('İşlem sırasında hata oluştu.'); }
        finally { setRevokeLoading(null); }
    };

    const handleBulkRevoke = async () => {
        if (!selectedUser || selectedIds.size === 0 || !bulkRevokeReason.trim()) return;
        const codes = userCaps
            .filter(c => selectedIds.has(c.id) && c.status === 1)
            .map(c => c.capabilityCode);
        setBulkRevokeLoading(true);
        try {
            const dto: RevokeBulkDto = { capabilityCodes: codes, reason: bulkRevokeReason };
            const res = await capabilityService.revokeBulk(selectedUser.id, dto);
            alert(res.data.message || 'Toplu kaldırma tamamlandı.');
            setShowBulkDialog(false);
            setSelectedIds(new Set());
            setBulkRevokeReason('');
            reloadCaps();
        } catch { alert('İşlem sırasında hata oluştu.'); }
        finally { setBulkRevokeLoading(false); }
    };

    // Filtreli liste — tüm filtreler birleşik çalışır
    const filteredCaps = userCaps.filter(cap => {
        const capMeta = catalog.find(c => c.code === cap.capabilityCode);
        // Metin araması
        if (capFilter.trim()) {
            const q = capFilter.toLowerCase();
            const matchCode = cap.capabilityCode.toLowerCase().includes(q);
            const matchDesc = capMeta?.description?.toLowerCase().includes(q) ?? false;
            if (!matchCode && !matchDesc) return false;
        }
        // Grup filtresi
        if (capGroupFilter) {
            const gk = capMeta?.groupKey ?? cap.category ?? '';
            if (gk !== capGroupFilter) return false;
        }
        // Kapsam filtresi
        if (capScopeFilter !== 'all') {
            const scope = capMeta?.pageScope ?? 'Action';
            if (scope !== capScopeFilter) return false;
        }
        return true;
    });

    // Mevcut yetkilerden türetilen grup listesi (sadece kullanıcıda olanlar)
    const userCapGroups = Array.from(new Set(
        userCaps.map(cap => {
            const capMeta = catalog.find(c => c.code === cap.capabilityCode);
            return capMeta?.groupKey ?? cap.category ?? '';
        }).filter(Boolean)
    )).sort();

    const activeCaps = filteredCaps.filter(c => c.status === 1);
    const allSelected = activeCaps.length > 0 && activeCaps.every(c => selectedIds.has(c.id));
    const toggleAll = () => {
        if (allSelected) {
            const next = new Set(selectedIds);
            activeCaps.forEach(c => next.delete(c.id));
            setSelectedIds(next);
        } else {
            setSelectedIds(new Set([...selectedIds, ...activeCaps.map(c => c.id)]));
        }
    };
    const toggleOne = (id: number) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    if (!canRead) return (
        <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>
    );

    // Katalog özetinde gruplar
    const catalogGroupSummary = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, caps]) => ({ key, label: GROUP_LABELS[key] ?? key, count: caps.length }));

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
                            {/* Kullanıcı başlık satırı */}
                            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                                        {(selectedUser.name?.[0] ?? selectedUser.userName?.[0] ?? '?').toUpperCase()}
                                    </div>
                                    <div>
                                        <Link to={`/user/${selectedUser.userName}`} target="_blank"
                                            className="font-black text-slate-800 hover:text-indigo-600 transition">
                                            @{selectedUser.userName}
                                        </Link>
                                        <div className="text-xs text-slate-400">{selectedUser.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {canRevoke && selectedIds.size > 0 && (
                                        <button
                                            onClick={() => setShowBulkDialog(true)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-rose-600 text-white border border-rose-700 hover:bg-rose-700 transition shadow-sm"
                                        >
                                            {selectedIds.size} Seçileni Kaldır
                                        </button>
                                    )}
                                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                                        <input type="checkbox" checked={includeExpired} onChange={e => setIncludeExpired(e.target.checked)} className="rounded" />
                                        Süre dolmuşları göster
                                    </label>
                                </div>
                            </div>

                            {/* ── Filtre çubuğu ── */}
                            <div className="bg-slate-50/60 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center gap-2">
                                {/* Metin arama */}
                                <div className="relative flex-1 min-w-[160px]">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Yetki kodunu filtrele..."
                                        value={capFilter}
                                        onChange={e => setCapFilter(e.target.value)}
                                        className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                                    />
                                    {capFilter && (
                                        <button type="button" onClick={() => setCapFilter('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Grup filtresi */}
                                <select
                                    value={capGroupFilter}
                                    onChange={e => setCapGroupFilter(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-indigo-400 outline-none text-slate-600 max-w-[160px]"
                                >
                                    <option value="">Tüm gruplar</option>
                                    {userCapGroups.map(gk => (
                                        <option key={gk} value={gk}>{GROUP_LABELS[gk] ?? gk}</option>
                                    ))}
                                </select>

                                {/* Kapsam toggle */}
                                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[10px] font-black uppercase tracking-wider">
                                    {(['all', 'Action', 'Page'] as const).map((v, i) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setCapScopeFilter(v)}
                                            className={`px-3 py-1.5 transition ${capScopeFilter === v
                                                ? v === 'Page' ? 'bg-violet-600 text-white' : 'bg-indigo-600 text-white'
                                                : 'bg-white text-slate-500 hover:bg-slate-50'
                                            } ${i > 0 ? 'border-l border-slate-200' : ''}`}
                                        >
                                            {v === 'all' ? 'Tümü' : v === 'Page' ? 'Sayfa' : 'Aksiyon'}
                                        </button>
                                    ))}
                                </div>

                                {/* Sonuç sayacı */}
                                <div className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">
                                    {filteredCaps.length === userCaps.length
                                        ? `${userCaps.length} yetki`
                                        : `${filteredCaps.length} / ${userCaps.length} gösteriliyor`}
                                    {(capFilter || capGroupFilter || capScopeFilter !== 'all') && (
                                        <button
                                            type="button"
                                            onClick={() => { setCapFilter(''); setCapGroupFilter(''); setCapScopeFilter('all'); }}
                                            className="ml-2 text-indigo-500 hover:text-indigo-700 font-semibold underline"
                                        >
                                            Temizle
                                        </button>
                                    )}
                                </div>
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
                                                {canRevoke && (
                                                    <th className="px-3 py-3 text-left">
                                                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                                                    </th>
                                                )}
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetki Kodu</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Grup</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapsam</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Süre</th>
                                                <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {filteredCaps.length === 0 ? (
                                                <tr>
                                                    <td colSpan={canRevoke ? 7 : 6} className="text-center py-10 text-slate-400">
                                                        {userCaps.length === 0
                                                            ? 'Hiç yetki kaydı bulunamadı.'
                                                            : 'Filtre kriterlerine uyan yetki bulunamadı.'}
                                                    </td>
                                                </tr>
                                            ) : filteredCaps.map(cap => {
                                                const capMeta = catalog.find(c => c.code === cap.capabilityCode);
                                                const isPage = capMeta?.pageScope === 'Page';
                                                const groupLabel = GROUP_LABELS[capMeta?.groupKey ?? ''] ?? capMeta?.groupKey ?? cap.category ?? '—';
                                                return (
                                                    <tr key={cap.id} className={`hover:bg-slate-50 transition ${cap.status !== 1 ? 'opacity-50' : ''}`}>
                                                        {canRevoke && (
                                                            <td className="px-3 py-3">
                                                                {cap.status === 1 && (
                                                                    <input type="checkbox" checked={selectedIds.has(cap.id)} onChange={() => toggleOne(cap.id)} className="rounded" />
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                                                    {cap.capabilityCode}
                                                                </span>
                                                                {isPage && (
                                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 uppercase tracking-wider">
                                                                        Sayfa
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {cap.reason && (
                                                                <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{cap.reason}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <span className="text-xs text-slate-500">{groupLabel}</span>
                                                        </td>
                                                        <td className="px-5 py-3 text-xs text-slate-500">
                                                            {cap.institutionId
                                                                ? (institutions.find(i => i.id === cap.institutionId)?.name ?? `Kurum #${cap.institutionId}`)
                                                                : 'Global'}
                                                        </td>
                                                        <td className="px-5 py-3 text-xs text-slate-500">
                                                            {cap.expiresAt ? new Date(cap.expiresAt).toLocaleDateString('tr-TR') : '—'}
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                                                cap.status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
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
                                                );
                                            })}
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

                {/* SAĞ — Grant formu + Katalog özeti */}
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
                                                        <button type="button" onClick={() => setGrantSearch('')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
                                                        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([key, caps]) => (
                                                            <optgroup key={key} label={GROUP_LABELS[key] ?? key}>
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
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kurum Kapsamı (opsiyonel)</label>
                                        <select value={grantInstitutionId} onChange={e => setGrantInstitutionId(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                            <option value="">Global (tüm kurumlar)</option>
                                            {institutions.map(inst => <option key={inst.id} value={String(inst.id)}>{inst.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Son Kullanma Tarihi (opsiyonel)</label>
                                        <input type="datetime-local" value={grantExpiresAt} onChange={e => setGrantExpiresAt(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Gerekçe *</label>
                                        <input type="text" placeholder="Grant gerekçesi" value={grantReason}
                                            onChange={e => setGrantReason(e.target.value)} required minLength={3}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>

                                    <button type="submit" disabled={grantLoading || !grantCode || !grantReason.trim()}
                                        className="w-full py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20">
                                        {grantLoading ? 'Ekleniyor...' : 'Yetki Ekle'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Katalog özeti — grup başlıklı */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <h2 className="text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">Katalog Özeti</h2>
                        {catalogLoading ? (
                            <div className="text-xs text-slate-400">Yükleniyor...</div>
                        ) : (
                            <div className="space-y-1.5 max-h-72 overflow-y-auto">
                                {catalogGroupSummary.map(({ key, label, count }) => (
                                    <div key={key} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600 text-xs">{label}</span>
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{count}</span>
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

            {/* ── TOPLU KALDIRMA DIALOG ────────────────────────────────── */}
            {showBulkDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-black text-slate-800 text-lg">{selectedIds.size} Yetkiyi Kaldır</h2>
                            <button onClick={() => setShowBulkDialog(false)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                                <div className="text-xs font-black text-rose-700 mb-2">Kaldırılacak yetkiler:</div>
                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                    {userCaps.filter(c => selectedIds.has(c.id) && c.status === 1).map(c => (
                                        <span key={c.id} className="text-[10px] bg-white text-rose-600 border border-rose-200 px-2 py-0.5 rounded font-mono">
                                            {c.capabilityCode}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Gerekçe *</label>
                                <input type="text" value={bulkRevokeReason} onChange={e => setBulkRevokeReason(e.target.value)}
                                    placeholder="Toplu kaldırma gerekçesi" minLength={3}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowBulkDialog(false)}
                                className="px-5 py-2 text-xs font-black uppercase bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">
                                İptal
                            </button>
                            <button onClick={handleBulkRevoke} disabled={bulkRevokeLoading || !bulkRevokeReason.trim()}
                                className="px-5 py-2 text-xs font-black uppercase bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition disabled:opacity-50 shadow-md shadow-rose-500/20">
                                {bulkRevokeLoading ? 'Kaldırılıyor...' : 'Tümünü Kaldır'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
