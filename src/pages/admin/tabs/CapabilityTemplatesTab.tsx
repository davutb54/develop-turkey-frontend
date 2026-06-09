import { useState, useEffect, useRef } from 'react';
import {
    capabilityService,
    type CapabilityDto,
    type CapabilityTemplateDto,
    type TemplateVersionDto,
    type RevokeAppliedTemplateDto,
} from '../../../services/capabilityService';
import { institutionService } from '../../../services/institutionService';
import { userService } from '../../../services/userService';
import { useCapability } from '../../../hooks/useCapability';
import UserSearchInput from '../../../components/admin/UserSearchInput';
import type { UserDetailDto } from '../../../types';

interface InstitutionDto {
    id: number;
    name: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    admin: 'Yönetim',
    moderation: 'Moderasyon',
    expert: 'Uzman',
    user: 'Kullanıcı',
    'workflow.action': 'Workflow Action',
};

export default function CapabilityTemplatesTab() {
    const canCreate  = useCapability('admin.capability_template_create');
    const canPublish = useCapability('admin.capability_template_publish');
    const canApply   = useCapability('admin.capability_template_apply');
    const canRead    = useCapability('admin.capability_catalog_read');

    const [templates, setTemplates] = useState<CapabilityTemplateDto[]>([]);
    const [catalog, setCatalog] = useState<CapabilityDto[]>([]);
    const [institutions, setInstitutions] = useState<InstitutionDto[]>([]);
    const [loading, setLoading] = useState(true);

    // Aktif görünüm: 'list' | 'create'
    const [view, setView] = useState<'list' | 'create'>('list');

    // Kind tab filtresi: 0 = Rol, 1 = Paket
    const [kindTab, setKindTab] = useState<0 | 1>(0);

    // Yeni şablon formu
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newKind, setNewKind] = useState<0 | 1>(0);
    const [newCodes, setNewCodes] = useState<string[]>([]);
    const [createLoading, setCreateLoading] = useState(false);

    // Publish modal
    const [publishTemplateId, setPublishTemplateId] = useState<number | null>(null);
    const [publishCodes, setPublishCodes] = useState<string[]>([]);
    const [publishNote, setPublishNote] = useState('');
    const [publishLoading, setPublishLoading] = useState(false);

    // Apply modal
    const [applyTemplate, setApplyTemplate] = useState<CapabilityTemplateDto | null>(null);
    const [applyVersions, setApplyVersions] = useState<TemplateVersionDto[]>([]);
    const [applyVersionId, setApplyVersionId] = useState<number | null>(null);
    const [applySelectedUsers, setApplySelectedUsers] = useState<UserDetailDto[]>([]);
    const [applyUserQuery, setApplyUserQuery] = useState('');
    const [applyUserResults, setApplyUserResults] = useState<UserDetailDto[]>([]);
    const [applyUserDropOpen, setApplyUserDropOpen] = useState(false);
    const [applyUserSearchLoading, setApplyUserSearchLoading] = useState(false);
    const applyUserSearchRef = useRef<HTMLDivElement>(null);
    const [applyInstitutionId, setApplyInstitutionId] = useState('');
    const [applyExpiresAt, setApplyExpiresAt] = useState('');
    const [applyReason, setApplyReason] = useState('');
    const [applyLoading, setApplyLoading] = useState(false);

    // Tekil uygulama modal
    const [singleApplyTemplate, setSingleApplyTemplate] = useState<CapabilityTemplateDto | null>(null);
    const [singleApplyVersions, setSingleApplyVersions] = useState<TemplateVersionDto[]>([]);
    const [singleApplyVersionId, setSingleApplyVersionId] = useState<number | null>(null);
    const [singleApplyUser, setSingleApplyUser] = useState<UserDetailDto | null>(null);
    const [singleApplyInstitutionId, setSingleApplyInstitutionId] = useState('');
    const [singleApplyExpiresAt, setSingleApplyExpiresAt] = useState('');
    const [singleApplyReason, setSingleApplyReason] = useState('');
    const [singleApplyLoading, setSingleApplyLoading] = useState(false);

    // Revoke applied modal
    const [revokeTemplate, setRevokeTemplate] = useState<CapabilityTemplateDto | null>(null);
    const [revokeUser, setRevokeUser] = useState<UserDetailDto | null>(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [revokeLoading, setRevokeLoading] = useState(false);

    // Versions drawer
    const [viewVersionsId, setViewVersionsId] = useState<number | null>(null);
    const [versions, setVersions] = useState<TemplateVersionDto[]>([]);
    const [versionsLoading, setVersionsLoading] = useState(false);

    const categories = Array.from(new Set(catalog.map(c => c.category ?? 'Diğer')));
    const grouped = categories.reduce((acc, cat) => {
        acc[cat] = catalog.filter(c => (c.category ?? 'Diğer') === cat);
        return acc;
    }, {} as Record<string, CapabilityDto[]>);

    const load = async () => {
        setLoading(true);
        try {
            const [tmplRes, catRes, instRes] = await Promise.all([
                capabilityService.getTemplates(),
                capabilityService.getAll(),
                institutionService.getAll(),
            ]);
            if (tmplRes.data.success) setTemplates(tmplRes.data.data);
            if (catRes.data.success) setCatalog(catRes.data.data);
            const instData = instRes.data?.data ?? instRes.data;
            if (Array.isArray(instData)) setInstitutions(instData);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { if (canRead) load(); }, [canRead]);

    // Apply modal — kullanıcı arama
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (applyUserSearchRef.current && !applyUserSearchRef.current.contains(e.target as Node))
                setApplyUserDropOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (applyUserQuery.length < 2) { setApplyUserResults([]); return; }
        const timer = setTimeout(async () => {
            setApplyUserSearchLoading(true);
            try {
                const res = await userService.getAllPaged({ searchText: applyUserQuery, pageSize: 8 });
                if (res.data.success) {
                    const data = res.data.data.items ?? res.data.data;
                    setApplyUserResults(data.filter((u: UserDetailDto) => !applySelectedUsers.some(s => s.id === u.id)));
                    setApplyUserDropOpen(true);
                }
            } catch { setApplyUserResults([]); }
            finally { setApplyUserSearchLoading(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [applyUserQuery, applySelectedUsers]);

    const toggleCode = (code: string, list: string[], setter: (v: string[]) => void) => {
        setter(list.includes(code) ? list.filter(c => c !== code) : [...list, code]);
    };

    // ── CREATE ───────────────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newCodes.length === 0) return;
        setCreateLoading(true);
        try {
            const res = await capabilityService.createTemplate({
                name: newName,
                description: newDesc,
                kind: newKind,
                capabilityCodes: newCodes,
            });
            if (res.data.success) {
                setView('list');
                setNewName(''); setNewDesc(''); setNewKind(0); setNewCodes([]);
                load();
            } else {
                alert(res.data.message || 'Oluşturma başarısız.');
            }
        } catch { alert('Hata oluştu.'); }
        finally { setCreateLoading(false); }
    };

    // ── PUBLISH ──────────────────────────────────────────────────────────────
    const openPublish = (template: CapabilityTemplateDto) => {
        setPublishTemplateId(template.id);
        // Önceki versiyonun kodlarını başlangıç değeri olarak al
        const prevCodes = template.latestVersion?.items.map(i => i.capabilityCode) ?? [];
        setPublishCodes(prevCodes);
        setPublishNote('');
    };

    const handlePublish = async () => {
        if (!publishTemplateId || publishCodes.length === 0) return;
        setPublishLoading(true);
        try {
            const res = await capabilityService.publishTemplate(publishTemplateId, {
                capabilityCodes: publishCodes,
                changeNote: publishNote,
            });
            if (res.data.success) {
                setPublishTemplateId(null);
                load();
            } else {
                alert(res.data.message || 'Yayımlama başarısız.');
            }
        } catch { alert('Hata oluştu.'); }
        finally { setPublishLoading(false); }
    };

    // ── APPLY ────────────────────────────────────────────────────────────────
    const openApply = async (template: CapabilityTemplateDto) => {
        setApplyTemplate(template);
        setApplyVersionId(null);
        setApplySelectedUsers([]);
        setApplyUserQuery('');
        setApplyUserResults([]);
        setApplyUserDropOpen(false);
        setApplyInstitutionId('');
        setApplyExpiresAt('');
        setApplyReason('');
        try {
            const res = await capabilityService.getTemplateVersions(template.id);
            if (res.data.success) {
                const published = res.data.data.filter((v: TemplateVersionDto) => v.publishedAt);
                setApplyVersions(published);
                if (published.length > 0) setApplyVersionId(published[published.length - 1].id);
            }
        } catch { setApplyVersions([]); }
    };

    const handleApply = async () => {
        if (!applyTemplate || !applyVersionId || !applyReason.trim()) return;
        if (applySelectedUsers.length === 0) { alert('En az bir kullanıcı seçilmeli.'); return; }
        setApplyLoading(true);
        try {
            const res = await capabilityService.applyTemplate(applyTemplate.id, {
                templateVersionId: applyVersionId,
                userIds: applySelectedUsers.map(u => u.id),
                institutionId: applyInstitutionId ? parseInt(applyInstitutionId) : undefined,
                expiresAt: applyExpiresAt || undefined,
                reason: applyReason,
            });
            if (res.data.success) {
                alert(`Şablon ${applySelectedUsers.length} kullanıcıya uygulandı.`);
                setApplyTemplate(null);
            } else {
                alert(res.data.message || 'Uygulama başarısız.');
            }
        } catch { alert('Hata oluştu.'); }
        finally { setApplyLoading(false); }
    };

    // ── SINGLE APPLY ─────────────────────────────────────────────────────────
    const openSingleApply = async (template: CapabilityTemplateDto) => {
        setSingleApplyTemplate(template);
        setSingleApplyUser(null);
        setSingleApplyVersionId(null);
        setSingleApplyInstitutionId('');
        setSingleApplyExpiresAt('');
        setSingleApplyReason('');
        try {
            const res = await capabilityService.getTemplateVersions(template.id);
            if (res.data.success) {
                const published = res.data.data.filter((v: TemplateVersionDto) => v.publishedAt);
                setSingleApplyVersions(published);
                if (published.length > 0) setSingleApplyVersionId(published[published.length - 1].id);
            }
        } catch { setSingleApplyVersions([]); }
    };

    const handleSingleApply = async () => {
        if (!singleApplyTemplate || !singleApplyVersionId || !singleApplyUser || !singleApplyReason.trim()) return;
        setSingleApplyLoading(true);
        try {
            const res = await capabilityService.applyTemplate(singleApplyTemplate.id, {
                templateVersionId: singleApplyVersionId,
                userIds: [singleApplyUser.id],
                institutionId: singleApplyInstitutionId ? parseInt(singleApplyInstitutionId) : undefined,
                expiresAt: singleApplyExpiresAt || undefined,
                reason: singleApplyReason,
            });
            if (res.data.success) {
                alert(`Şablon "${singleApplyTemplate.name}" → ${singleApplyUser.userName} kullanıcısına uygulandı.`);
                setSingleApplyTemplate(null);
            } else {
                alert(res.data.message || 'Uygulama başarısız.');
            }
        } catch { alert('Hata oluştu.'); }
        finally { setSingleApplyLoading(false); }
    };

    // ── REVOKE APPLIED ───────────────────────────────────────────────────────
    const openRevoke = (template: CapabilityTemplateDto) => {
        setRevokeTemplate(template);
        setRevokeUser(null);
        setRevokeReason('');
    };

    const handleRevokeApplied = async () => {
        if (!revokeTemplate || !revokeUser || !revokeReason.trim()) return;
        setRevokeLoading(true);
        try {
            const dto: RevokeAppliedTemplateDto = { userId: revokeUser.id, reason: revokeReason };
            const res = await capabilityService.revokeApplied(revokeTemplate.id, dto);
            if (res.data.success) {
                alert(`Şablon "${revokeTemplate.name}" → ${revokeUser.userName} kullanıcısından kaldırıldı.`);
                setRevokeTemplate(null);
            } else {
                alert(res.data.message || 'Kaldırma başarısız.');
            }
        } catch { alert('Hata oluştu.'); }
        finally { setRevokeLoading(false); }
    };

    // ── VERSIONS ─────────────────────────────────────────────────────────────
    const viewVersions = async (id: number) => {
        if (viewVersionsId === id) { setViewVersionsId(null); return; }
        setViewVersionsId(id);
        setVersionsLoading(true);
        try {
            const res = await capabilityService.getTemplateVersions(id);
            if (res.data.success) setVersions(res.data.data);
        } catch { setVersions([]); }
        finally { setVersionsLoading(false); }
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
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Yetki Şablonları</h1>
                    <p className="text-slate-500 text-sm mt-1">Yetki paketleri oluşturun ve kullanıcılara toplu uygulayın.</p>
                </div>
                {canCreate && view === 'list' && (
                    <button
                        onClick={() => setView('create')}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20"
                    >
                        + Yeni Şablon
                    </button>
                )}
                {view === 'create' && (
                    <button
                        onClick={() => setView('list')}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 transition"
                    >
                        ← Listeye Dön
                    </button>
                )}
            </div>

            {/* ── YENİ ŞABLON FORMU ─────────────────────────────────────── */}
            {view === 'create' && (
                <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                    <h2 className="text-base font-black text-slate-700">Yeni Şablon Oluştur</h2>

                    {/* Kind seçici */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Tür *</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setNewKind(0)}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition ${newKind === 0 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                            >
                                🎭 Rol Şablonu
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewKind(1)}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition ${newKind === 1 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
                            >
                                📦 Yetenek Paketi
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {newKind === 0 ? 'Tam rol tanımı — kullanıcının temel yetki seti.' : 'Modüler eklenti — mevcut role üstüne toggle ile eklenir.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Ad *</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                required
                                placeholder="Şablon adı"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Açıklama</label>
                            <input
                                type="text"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                placeholder="Opsiyonel"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                            Yetkiler * — {newCodes.length} seçili
                        </label>
                        <div className="space-y-3 max-h-80 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50">
                            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, caps]) => (
                                <div key={cat}>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        {CATEGORY_LABELS[cat] ?? cat}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {caps.filter(c => c.isActive).map(c => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => toggleCode(c.code, newCodes, setNewCodes)}
                                                title={c.description}
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition ${
                                                    newCodes.includes(c.code)
                                                        ? 'bg-indigo-600 text-white border-indigo-700'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                }`}
                                            >
                                                {c.code}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={createLoading || !newName.trim() || newCodes.length === 0}
                        className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
                    >
                        {createLoading ? 'Oluşturuluyor...' : 'Şablon Oluştur'}
                    </button>
                </form>
            )}

            {/* ── ŞABLON LİSTESİ ───────────────────────────────────────── */}
            {view === 'list' && (
                <>
                {/* Kind sekme seçici */}
                <div className="flex gap-2 mb-5">
                    <button
                        onClick={() => setKindTab(0)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl border transition ${kindTab === 0 ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-500/20' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                        🎭 Rol Şablonları
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${kindTab === 0 ? 'bg-indigo-500' : 'bg-slate-100 text-slate-500'}`}>
                            {templates.filter(t => (t.kind ?? 0) === 0).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setKindTab(1)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl border transition ${kindTab === 1 ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/20' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
                    >
                        📦 Yetenek Paketleri
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${kindTab === 1 ? 'bg-emerald-500' : 'bg-slate-100 text-slate-500'}`}>
                            {templates.filter(t => (t.kind ?? 0) === 1).length}
                        </span>
                    </button>
                </div>
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500" />
                    </div>
                ) : templates.filter(t => (t.kind ?? 0) === kindTab).length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center text-slate-400">
                        <div className="text-5xl mb-4">{kindTab === 0 ? '🎭' : '📦'}</div>
                        <p className="font-bold">Henüz {kindTab === 0 ? 'rol şablonu' : 'yetenek paketi'} oluşturulmadı.</p>
                        <p className="text-sm mt-1">Yukarıdaki "Yeni Şablon" butonunu kullanın.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {templates.filter(t => (t.kind ?? 0) === kindTab).map(tmpl => (
                            <div key={tmpl.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-slate-800">{tmpl.name}</span>
                                            {tmpl.slug && (
                                                <span className="text-[9px] text-slate-400 font-mono">{tmpl.slug}</span>
                                            )}
                                            {!tmpl.isActive && (
                                                <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-black uppercase">Pasif</span>
                                            )}
                                            {tmpl.latestVersion && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${(tmpl.kind ?? 0) === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    v{tmpl.latestVersion.version} — {tmpl.latestVersion.items.length} yetki
                                                </span>
                                            )}
                                        </div>
                                        {tmpl.description && (
                                            <p className="text-xs text-slate-400">{tmpl.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        <button
                                            onClick={() => viewVersions(tmpl.id)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition shadow-sm"
                                        >
                                            {viewVersionsId === tmpl.id ? 'Gizle' : 'Versiyonlar'}
                                        </button>
                                        {canPublish && tmpl.isActive && (
                                            <button
                                                onClick={() => openPublish(tmpl)}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-amber-600 border border-amber-200 hover:bg-amber-50 transition shadow-sm"
                                            >
                                                Yayımla
                                            </button>
                                        )}
                                        {canApply && tmpl.latestVersion && tmpl.isActive && (
                                            <>
                                                <button
                                                    onClick={() => openSingleApply(tmpl)}
                                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50 transition shadow-sm"
                                                >
                                                    👤 Tekil
                                                </button>
                                                <button
                                                    onClick={() => openApply(tmpl)}
                                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 transition shadow-sm"
                                                >
                                                    Toplu Uygula
                                                </button>
                                                <button
                                                    onClick={() => openRevoke(tmpl)}
                                                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition shadow-sm"
                                                >
                                                    Şablonu Kaldır
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Versiyonlar drawer */}
                                {viewVersionsId === tmpl.id && (
                                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                                        {versionsLoading ? (
                                            <div className="text-xs text-slate-400">Yükleniyor...</div>
                                        ) : versions.length === 0 ? (
                                            <div className="text-xs text-slate-400 italic">Henüz yayımlanmış versiyon yok.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {[...versions].reverse().map(v => (
                                                    <div key={v.id} className="flex items-start gap-4">
                                                        <span className="text-xs font-black text-indigo-600 w-8 shrink-0">v{v.version}</span>
                                                        <div className="flex-1">
                                                            <div className="text-xs text-slate-500">
                                                                {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('tr-TR') : 'Taslak'}
                                                                {v.changeNote && <span className="ml-2 italic">— {v.changeNote}</span>}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {v.items?.map(item => (
                                                                    <span key={item.id} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                                                                        {item.capabilityCode}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                </>
            )}

            {/* ── PUBLISH MODAL ────────────────────────────────────────── */}
            {publishTemplateId !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <h2 className="font-black text-slate-800 text-lg">Yeni Versiyon Yayımla</h2>
                            <button onClick={() => setPublishTemplateId(null)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Değişiklik Notu</label>
                                <input
                                    type="text"
                                    value={publishNote}
                                    onChange={e => setPublishNote(e.target.value)}
                                    placeholder="Ne değişti?"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                    Yetkiler — {publishCodes.length} seçili
                                </label>
                                <div className="space-y-3 max-h-72 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50">
                                    {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, caps]) => (
                                        <div key={cat}>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{CATEGORY_LABELS[cat] ?? cat}</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {caps.filter(c => c.isActive).map(c => (
                                                    <button
                                                        key={c.code}
                                                        type="button"
                                                        onClick={() => toggleCode(c.code, publishCodes, setPublishCodes)}
                                                        title={c.description}
                                                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition ${
                                                            publishCodes.includes(c.code)
                                                                ? 'bg-indigo-600 text-white border-indigo-700'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                        }`}
                                                    >
                                                        {c.code}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setPublishTemplateId(null)} className="px-5 py-2 text-xs font-black uppercase bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">İptal</button>
                            <button
                                onClick={handlePublish}
                                disabled={publishLoading || publishCodes.length === 0}
                                className="px-5 py-2 text-xs font-black uppercase bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition disabled:opacity-50"
                            >
                                {publishLoading ? 'Yayımlanıyor...' : 'Yayımla'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── APPLY MODAL ──────────────────────────────────────────── */}
            {applyTemplate !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 text-lg">Şablonu Uygula</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{applyTemplate.name}</p>
                            </div>
                            <button onClick={() => setApplyTemplate(null)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Versiyon</label>
                                <select
                                    value={applyVersionId ?? ''}
                                    onChange={e => setApplyVersionId(parseInt(e.target.value))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    {applyVersions.map(v => (
                                        <option key={v.id} value={v.id}>
                                            v{v.version} — {v.items?.length ?? 0} yetki {v.publishedAt ? `(${new Date(v.publishedAt).toLocaleDateString('tr-TR')})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kurum Kapsamı (opsiyonel)</label>
                                <select
                                    value={applyInstitutionId}
                                    onChange={e => setApplyInstitutionId(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="">Global (tüm kurumlar)</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={String(inst.id)}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                    Kullanıcılar * — {applySelectedUsers.length} seçili
                                </label>

                                {/* Seçili kullanıcı chip'leri */}
                                {applySelectedUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {applySelectedUsers.map(u => (
                                            <span key={u.id} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700">
                                                @{u.userName}
                                                <button
                                                    type="button"
                                                    onClick={() => setApplySelectedUsers(prev => prev.filter(x => x.id !== u.id))}
                                                    className="text-indigo-400 hover:text-rose-500 leading-none"
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Arama */}
                                <div ref={applyUserSearchRef} className="relative">
                                    <input
                                        type="text"
                                        value={applyUserQuery}
                                        onChange={e => setApplyUserQuery(e.target.value)}
                                        placeholder="İsim, e-posta veya kullanıcı adı ara..."
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    {applyUserSearchLoading && (
                                        <div className="absolute right-3 top-3 text-slate-400 text-xs">...</div>
                                    )}
                                    {applyUserDropOpen && applyUserResults.length > 0 && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                                            {applyUserResults.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setApplySelectedUsers(prev => [...prev, u]);
                                                        setApplyUserQuery('');
                                                        setApplyUserDropOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-left"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                        {u.userName?.[0]?.toUpperCase() ?? '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium truncate">@{u.userName}</div>
                                                        <div className="text-xs text-slate-400 truncate">{u.email}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Son Kullanma Tarihi (opsiyonel)</label>
                                <input
                                    type="datetime-local"
                                    value={applyExpiresAt}
                                    onChange={e => setApplyExpiresAt(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Gerekçe *</label>
                                <input
                                    type="text"
                                    value={applyReason}
                                    onChange={e => setApplyReason(e.target.value)}
                                    placeholder="Uygulama gerekçesi"
                                    required
                                    minLength={3}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setApplyTemplate(null)} className="px-5 py-2 text-xs font-black uppercase bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">İptal</button>
                            <button
                                onClick={handleApply}
                                disabled={applyLoading || !applyVersionId || !applyReason.trim() || applySelectedUsers.length === 0}
                                className="px-5 py-2 text-xs font-black uppercase bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
                            >
                                {applyLoading ? 'Uygulanıyor...' : 'Uygula'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ŞABLONU KALDIR MODAL ─────────────────────────────────────── */}
            {revokeTemplate !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 text-lg">Şablonu Kullanıcıdan Kaldır</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{revokeTemplate.name}</p>
                            </div>
                            <button onClick={() => setRevokeTemplate(null)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
                                Bu şablondaki tüm yetkiler seçilen kullanıcıdan kaldırılır.
                                Şablonun yüklü olduğu kullanıcılara işlem geri alınamaz.
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kullanıcı *</label>
                                <UserSearchInput
                                    selectedUser={revokeUser}
                                    onSelect={setRevokeUser}
                                    onClear={() => setRevokeUser(null)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Gerekçe *</label>
                                <input
                                    type="text"
                                    value={revokeReason}
                                    onChange={e => setRevokeReason(e.target.value)}
                                    placeholder="Kaldırma gerekçesi"
                                    minLength={3}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setRevokeTemplate(null)}
                                className="px-5 py-2 text-xs font-black uppercase bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">
                                İptal
                            </button>
                            <button
                                onClick={handleRevokeApplied}
                                disabled={revokeLoading || !revokeUser || !revokeReason.trim()}
                                className="px-5 py-2 text-xs font-black uppercase bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition disabled:opacity-50 shadow-md shadow-rose-500/20"
                            >
                                {revokeLoading ? 'Kaldırılıyor...' : 'Şablonu Kaldır'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TEKİL UYGULA MODAL ──────────────────────────────────────── */}
            {singleApplyTemplate !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-800 text-lg">Tekil Kullanıcıya Uygula</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{singleApplyTemplate.name}</p>
                            </div>
                            <button onClick={() => setSingleApplyTemplate(null)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kullanıcı *</label>
                                <UserSearchInput
                                    selectedUser={singleApplyUser}
                                    onSelect={setSingleApplyUser}
                                    onClear={() => setSingleApplyUser(null)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Versiyon</label>
                                <select
                                    value={singleApplyVersionId ?? ''}
                                    onChange={e => setSingleApplyVersionId(parseInt(e.target.value))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    {singleApplyVersions.map(v => (
                                        <option key={v.id} value={v.id}>
                                            v{v.version} — {v.items?.length ?? 0} yetki {v.publishedAt ? `(${new Date(v.publishedAt).toLocaleDateString('tr-TR')})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kurum Kapsamı (opsiyonel)</label>
                                <select
                                    value={singleApplyInstitutionId}
                                    onChange={e => setSingleApplyInstitutionId(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="">Global (tüm kurumlar)</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={String(inst.id)}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Son Kullanma Tarihi (opsiyonel)</label>
                                <input
                                    type="datetime-local"
                                    value={singleApplyExpiresAt}
                                    onChange={e => setSingleApplyExpiresAt(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Gerekçe *</label>
                                <input
                                    type="text"
                                    value={singleApplyReason}
                                    onChange={e => setSingleApplyReason(e.target.value)}
                                    placeholder="Uygulama gerekçesi"
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setSingleApplyTemplate(null)} className="px-5 py-2 text-xs font-black uppercase bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">İptal</button>
                            <button
                                onClick={handleSingleApply}
                                disabled={singleApplyLoading || !singleApplyUser || !singleApplyVersionId || !singleApplyReason.trim()}
                                className="px-5 py-2 text-xs font-black uppercase bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
                            >
                                {singleApplyLoading ? 'Uygulanıyor...' : 'Uygula'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
