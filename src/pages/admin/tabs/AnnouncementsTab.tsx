import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { institutionService } from '../../../services/institutionService';
import { useCapability } from '../../../hooks/useCapability';
import type { IDataResult, IResult } from '../../../types';
import { fmtDateTime } from '../../../utils/dateFormat';

interface AnnouncementDto {
    id: number;
    title: string;
    content: string;
    targetGroup: string;
    institutionId?: number;
    link?: string;
    isActive: boolean;
    createdByUserId: number;
    createdAt: string;
    expiresAt?: string;
}

interface CreateAnnouncementDto {
    title: string;
    content: string;
    targetGroup: string;
    institutionId?: number;
    link?: string;
    expiresAt?: string;
}

const TARGET_LABELS: Record<string, string> = {
    all: 'Herkese',
    registered: 'Kayıtlı Kullanıcılar',
    institution: 'Kurum',
};

const TARGET_COLORS: Record<string, string> = {
    all:        'bg-indigo-100 text-indigo-800',
    registered: 'bg-sky-100 text-sky-800',
    institution:'bg-amber-100 text-amber-800',
};

export default function AnnouncementsTab() {
    const canCreate   = useCapability('admin.announcement_create');
    const canDelete   = useCapability('admin.announcement_delete');
    const canRead     = useCapability('admin.announcement_read');

    const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [institutions, setInstitutions] = useState<{ id: number; name: string }[]>([]);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [targetGroup, setTargetGroup] = useState('all');
    const [institutionId, setInstitutionId] = useState('');
    const [link, setLink] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        if (canCreate) {
            institutionService.getAll()
                .then(res => { if (res.data?.success) setInstitutions(res.data.data ?? []); })
                .catch(() => {/* yetkisiz ise sessizce geç */});
        }
    }, [canCreate]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get<IDataResult<AnnouncementDto[]>>('/announcements/all');
            if (res.data?.success) setAnnouncements(res.data.data ?? []);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { if (canRead) load(); }, [canRead]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        setCreateLoading(true);
        setCreateError('');
        try {
            const dto: CreateAnnouncementDto = {
                title: title.trim(),
                content: content.trim(),
                targetGroup,
                institutionId: institutionId ? parseInt(institutionId) : undefined,
                link: link.trim() || undefined,
                expiresAt: expiresAt || undefined,
            };
            const res = await api.post<IResult>('/announcements', dto);
            if (res.data?.success) {
                setShowForm(false);
                setTitle(''); setContent(''); setTargetGroup('all');
                setInstitutionId(''); setLink(''); setExpiresAt('');
                load();
            } else {
                setCreateError(res.data?.message || 'Oluşturma başarısız.');
            }
        } catch { setCreateError('Sunucu hatası.'); }
        finally { setCreateLoading(false); }
    };

    const handleDeactivate = async (id: number) => {
        setActionLoading(id);
        try {
            await api.put<IResult>(`/announcements/${id}/deactivate`);
            load();
        } catch { }
        finally { setActionLoading(null); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) return;
        setActionLoading(id);
        try {
            await api.delete<IResult>(`/announcements/${id}`);
            load();
        } catch { }
        finally { setActionLoading(null); }
    };

    if (!canRead) {
        return <div className="p-10 text-center text-slate-500">Bu sayfayı görüntüleme yetkiniz yok.</div>;
    }

    const active   = announcements.filter(a => a.isActive);
    const inactive = announcements.filter(a => !a.isActive);

    return (
        <div className="p-6 md:p-10 animate-fade-in">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Duyurular</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Platform geneli duyurular — ana sayfada banner olarak gösterilir.
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 flex-shrink-0"
                    >
                        {showForm ? '× Kapat' : '+ Yeni Duyuru'}
                    </button>
                )}
            </div>

            {/* ── Oluşturma Formu ───────────────────────────────────────── */}
            {showForm && canCreate && (
                <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                    <h2 className="font-black text-slate-800 mb-4">Yeni Duyuru Oluştur</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Başlık *</label>
                            <input
                                type="text" value={title} onChange={e => setTitle(e.target.value)} required
                                placeholder="Duyuru başlığı"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">İçerik *</label>
                            <textarea
                                rows={3} value={content} onChange={e => setContent(e.target.value)} required
                                placeholder="Duyuru içeriği"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Hedef Grup</label>
                            <select
                                value={targetGroup} onChange={e => setTargetGroup(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="all">Herkese (giriş yapmamış dahil)</option>
                                <option value="registered">Kayıtlı kullanıcılar</option>
                                <option value="institution">Belirli kurum</option>
                            </select>
                        </div>
                        {targetGroup === 'institution' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Kurum</label>
                                <select
                                    value={institutionId}
                                    onChange={e => setInstitutionId(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="">— Kurum seçin —</option>
                                    {institutions.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Bağlantı URL (opsiyonel)</label>
                            <input
                                type="url" value={link} onChange={e => setLink(e.target.value)}
                                placeholder="https://..."
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Son Geçerlilik Tarihi (opsiyonel)</label>
                            <input
                                type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    {createError && (
                        <p className="mt-3 text-xs text-red-600">{createError}</p>
                    )}
                    <div className="flex justify-end gap-3 mt-5">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="px-5 py-2 text-xs font-black uppercase bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">
                            İptal
                        </button>
                        <button type="submit" disabled={createLoading}
                            className="px-5 py-2 text-xs font-black uppercase bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20">
                            {createLoading ? 'Oluşturuluyor...' : 'Duyur'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="text-center text-slate-400 py-16">Yükleniyor...</div>
            ) : (
                <>
                    {/* ── Aktif Duyurular ───────────────────────────────── */}
                    <div className="mb-8">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                            Aktif — {active.length}
                        </h2>
                        {active.length === 0 ? (
                            <div className="text-slate-400 text-sm py-6 text-center bg-white rounded-2xl border border-slate-100">
                                Aktif duyuru yok.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {active.map(a => (
                                    <AnnouncementCard
                                        key={a.id}
                                        announcement={a}
                                        isLoading={actionLoading === a.id}
                                        canCreate={canCreate}
                                        canDelete={canDelete}
                                        onDeactivate={handleDeactivate}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Deaktif Duyurular ─────────────────────────────── */}
                    {inactive.length > 0 && (
                        <div>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                                Pasif — {inactive.length}
                            </h2>
                            <div className="space-y-3 opacity-60">
                                {inactive.map(a => (
                                    <AnnouncementCard
                                        key={a.id}
                                        announcement={a}
                                        isLoading={actionLoading === a.id}
                                        canCreate={canCreate}
                                        canDelete={canDelete}
                                        onDeactivate={handleDeactivate}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

interface CardProps {
    announcement: AnnouncementDto;
    isLoading: boolean;
    canCreate: boolean;
    canDelete: boolean;
    onDeactivate: (id: number) => void;
    onDelete: (id: number) => void;
}

function AnnouncementCard({ announcement: a, isLoading, canCreate, canDelete, onDeactivate, onDelete }: CardProps) {
    const now = new Date();
    const expired = a.expiresAt && new Date(a.expiresAt) < now;

    return (
        <div className={`bg-white rounded-2xl border ${a.isActive && !expired ? 'border-indigo-100' : 'border-slate-100'} shadow-sm p-5`}>
            <div className="flex items-start gap-4">
                <div className="text-2xl flex-shrink-0 mt-0.5">📢</div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-slate-800 text-sm">{a.title}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${TARGET_COLORS[a.targetGroup] ?? 'bg-gray-100 text-gray-700'}`}>
                            {TARGET_LABELS[a.targetGroup] ?? a.targetGroup}
                            {a.institutionId ? ` #${a.institutionId}` : ''}
                        </span>
                        {expired && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">Süresi Doldu</span>
                        )}
                        {!a.isActive && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Pasif</span>
                        )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{a.content}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>Oluşturuldu: {fmtDateTime(a.createdAt)}</span>
                        {a.expiresAt && <span>Bitiş: {fmtDateTime(a.expiresAt)}</span>}
                        {a.link && (
                            <a href={a.link} target="_blank" rel="noreferrer" className="text-indigo-500 underline hover:text-indigo-700">
                                {a.link}
                            </a>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    {a.isActive && canCreate && (
                        <button
                            onClick={() => onDeactivate(a.id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-[10px] font-black uppercase rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition disabled:opacity-50"
                        >
                            Durdur
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => onDelete(a.id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-[10px] font-black uppercase rounded-lg bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition disabled:opacity-50"
                        >
                            Sil
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
