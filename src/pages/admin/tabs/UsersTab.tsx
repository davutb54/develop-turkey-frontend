import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { userService } from '../../../services/userService';
import { institutionService } from '../../../services/institutionService';
import { capabilityService, type CapabilityTemplateDto } from '../../../services/capabilityService';
import type { UserDetailDto, Institution, UserTitleDto } from '../../../types';
import { getProfileImageUrl } from '../../../utils/imageUtils';
import { useCapability } from '../../../hooks/useCapability';
import { fmtDateTime, fmtDate } from '../../../utils/dateFormat';
import { userTitleService } from '../../../services/userTitleService';

export default function UsersTab() {
    const canBan               = useCapability('admin.user_ban');
    const canUnban             = useCapability('admin.user_unban');
    const canWarn              = useCapability('moderation.user_warn');
    const canImpersonate       = useCapability('admin.user_impersonate');
    const canWarnRead          = useCapability('admin.user_warning_read_all');
    const canWarnRevoke        = useCapability('moderation.user_warn_revoke');
    const canChangeInstitution = useCapability('admin.user_institution_change');
    const canTitleAssign       = useCapability('admin.user_title_assign');
    const canCapabilityApply   = useCapability('admin.capability_template_apply');
    const [users, setUsers] = useState<UserDetailDto[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('');
    const [userEmailFilter, setUserEmailFilter] = useState('');
    const [userInstitutionFilter, setUserInstitutionFilter] = useState('');
    const [isReportedFilter, setIsReportedFilter] = useState(false);
    const [registeredAfterDays, setRegisteredAfterDays] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState('registerDate_desc');
    const [userPage, setUserPage] = useState(1);

    // Dropdown aksiyon menüsü
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [userTotalCount, setUserTotalCount] = useState(0);
    const [userLoading, setUserLoading] = useState(false);
    const USER_PAGE_SIZE = 10;

    // Modal state'leri
    const [impersonatingUser, setImpersonatingUser] = useState<number | null>(null);
    const [impersonatePassword, setImpersonatePassword] = useState('');
    const [warningTargetUserId, setWarningTargetUserId] = useState<number | null>(null);
    const [warningTitle, setWarningTitle] = useState('');
    const [warningMessage, setWarningMessage] = useState('');
    const [warningSeverity, setWarningSeverity] = useState('Warning');
    const [warningLoading, setWarningLoading] = useState(false);
    const [warningHistoryUserId, setWarningHistoryUserId] = useState<number | null>(null);
    const [warningHistory, setWarningHistory] = useState<any[]>([]);
    const [warningHistoryLoading, setWarningHistoryLoading] = useState(false);

    // Kurum Değiştir modal state
    const [changeInstUserId, setChangeInstUserId] = useState<number | null>(null);
    const [changeInstTarget, setChangeInstTarget] = useState('');
    const [changeInstLoading, setChangeInstLoading] = useState(false);

    // Unvan yönetimi modal state
    const [titleUserId, setTitleUserId] = useState<number | null>(null);
    const [titleUserName, setTitleUserName] = useState('');
    const [userTitles, setUserTitles] = useState<UserTitleDto[]>([]);
    const [titlesLoading, setTitlesLoading] = useState(false);
    const [newTitleLabel, setNewTitleLabel] = useState('');
    const [newTitleKind, setNewTitleKind] = useState<'official' | 'expert' | 'custom'>('custom');
    const [newTitleColor, setNewTitleColor] = useState('');
    const [newTitleIcon, setNewTitleIcon] = useState('');
    const [titleSubmitting, setTitleSubmitting] = useState(false);

    // Yetenek Paketleri modal state
    const [packageUserId, setPackageUserId] = useState<number | null>(null);
    const [packageUserName, setPackageUserName] = useState('');
    const [packageTemplates, setPackageTemplates] = useState<CapabilityTemplateDto[]>([]);
    const [userCapCodes, setUserCapCodes] = useState<Set<string>>(new Set());
    const [packageLoading, setPackageLoading] = useState(false);
    // { templateId, action: 'apply'|'revoke' } — hangi toggle bekliyor gerekçe
    const [pendingToggle, setPendingToggle] = useState<{ templateId: number; action: 'apply' | 'revoke' } | null>(null);
    const [toggleReason, setToggleReason] = useState('');
    const [toggleLoading, setToggleLoading] = useState(false);

    useEffect(() => {
        institutionService.getAll().then(res => { if (res.data.success) setInstitutions(res.data.data); });
        fetchUsers(1);
    }, []);

    const fetchUsers = async (page: number = 1) => {
        setUserLoading(true);
        try {
            const registeredAfter = registeredAfterDays
                ? new Date(Date.now() - registeredAfterDays * 86400000).toISOString()
                : undefined;
            const res = await userService.getAllPaged({
                page,
                pageSize: USER_PAGE_SIZE,
                searchText: userSearch || undefined,
                roleFilter: userRoleFilter || undefined,
                emailStatus: userEmailFilter || undefined,
                institutionId: userInstitutionFilter ? parseInt(userInstitutionFilter) : undefined,
                isReported: isReportedFilter || undefined,
                registeredAfter,
                sortBy: sortBy !== 'registerDate_desc' ? sortBy : undefined,
            });
            if (res.data.success) {
                setUsers(res.data.data);
                setUserTotalPages(res.data.totalPages || 1);
                setUserTotalCount(res.data.totalCount || 0);
                setUserPage(page);
            }
        } catch (err) { console.error('Kullanıcılar yüklenemedi', err); }
        finally { setUserLoading(false); }
    };

    const handleOpenMenu = (userId: number, e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        setOpenMenuId(userId);
    };

    const handleBanToggle = async (userId: number, isBanned: boolean) => {
        if (!window.confirm(`Kullanıcıyı ${isBanned ? 'açmak' : 'banlamak'} istediğinize emin misiniz?`)) return;
        try {
            if (isBanned) await adminService.unbanUser(userId);
            else await adminService.banUser(userId);
            fetchUsers(userPage);
        } catch { alert('İşlem başarısız.'); }
    };

    const handleIssueWarning = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warningTargetUserId) return;
        setWarningLoading(true);
        try {
            await adminService.issueWarning({ userId: warningTargetUserId, title: warningTitle, message: warningMessage, severity: warningSeverity });
            setWarningTargetUserId(null);
            setWarningTitle(''); setWarningMessage(''); setWarningSeverity('Warning');
            alert('Uyarı gönderildi.');
        } catch { alert('Uyarı gönderilemedi.'); }
        finally { setWarningLoading(false); }
    };

    const handleOpenWarningHistory = async (userId: number) => {
        setWarningHistoryUserId(userId);
        setWarningHistoryLoading(true);
        setWarningHistory([]);
        try {
            const res = await adminService.getUserWarnings(userId);
            if (res.data.success) setWarningHistory(res.data.data ?? []);
        } catch { /* sessizce geç */ }
        finally { setWarningHistoryLoading(false); }
    };

    const handleRevokeWarning = async (warningId: number) => {
        try {
            await adminService.revokeWarning(warningId);
            setWarningHistory(prev => prev.map(w => w.id === warningId ? { ...w, isActive: false } : w));
        } catch { alert('Uyarı geri alınamadı.'); }
    };

    const handleChangeInstitution = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!changeInstUserId || !changeInstTarget) return;
        setChangeInstLoading(true);
        try {
            await institutionService.changeUserInstitution(changeInstUserId, parseInt(changeInstTarget));
            setChangeInstUserId(null);
            setChangeInstTarget('');
            fetchUsers(userPage);
        } catch { alert('Kurum değiştirilemedi.'); }
        finally { setChangeInstLoading(false); }
    };

    const handleOpenTitleModal = async (userId: number, userName: string) => {
        setTitleUserId(userId);
        setTitleUserName(userName);
        setUserTitles([]);
        setTitlesLoading(true);
        try {
            const res = await userTitleService.getByUser(userId);
            if (res.data.success) setUserTitles(res.data.data);
        } catch { /* sessizce geç */ }
        finally { setTitlesLoading(false); }
    };

    const handleAssignTitle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titleUserId || !newTitleLabel.trim()) return;
        setTitleSubmitting(true);
        try {
            await userTitleService.assign({
                userId: titleUserId,
                label: newTitleLabel.trim(),
                kind: newTitleKind,
                color: newTitleColor || null,
                icon: newTitleIcon || null,
            });
            setNewTitleLabel(''); setNewTitleColor(''); setNewTitleIcon(''); setNewTitleKind('custom');
            const res = await userTitleService.getByUser(titleUserId);
            if (res.data.success) setUserTitles(res.data.data);
        } catch { alert('Unvan atanamadı.'); }
        finally { setTitleSubmitting(false); }
    };

    const handleRemoveTitle = async (titleId: number) => {
        if (!titleUserId) return;
        try {
            await userTitleService.remove(titleId);
            setUserTitles(prev => prev.filter(t => t.id !== titleId));
        } catch { alert('Unvan kaldırılamadı.'); }
    };

    const handleOpenPackages = async (userId: number, userName: string) => {
        setPackageUserId(userId);
        setPackageUserName(userName);
        setPendingToggle(null);
        setToggleReason('');
        setPackageLoading(true);
        try {
            const [tmplRes, capRes] = await Promise.all([
                capabilityService.getTemplates(),
                capabilityService.getByUser(userId),
            ]);
            const packages = (tmplRes.data.data ?? []).filter((t: CapabilityTemplateDto) => (t.kind ?? 0) === 1 && t.isActive);
            setPackageTemplates(packages);
            const activeCodes = new Set<string>(
                (capRes.data.data ?? [])
                    .filter((c: any) => !c.revokedAt)
                    .map((c: any) => c.capabilityCode as string)
            );
            setUserCapCodes(activeCodes);
        } catch { /* sessizce geç */ }
        finally { setPackageLoading(false); }
    };

    const isPackageActive = (tmpl: CapabilityTemplateDto): boolean => {
        const codes = tmpl.latestVersion?.items.map(i => i.capabilityCode) ?? [];
        return codes.length > 0 && codes.every(code => userCapCodes.has(code));
    };

    const handleTogglePackage = (tmpl: CapabilityTemplateDto) => {
        const action = isPackageActive(tmpl) ? 'revoke' : 'apply';
        setPendingToggle({ templateId: tmpl.id, action });
        setToggleReason('');
    };

    const handleConfirmToggle = async () => {
        if (!pendingToggle || !toggleReason.trim() || !packageUserId) return;
        const tmpl = packageTemplates.find(t => t.id === pendingToggle.templateId);
        if (!tmpl?.latestVersion) return;
        setToggleLoading(true);
        try {
            if (pendingToggle.action === 'apply') {
                await capabilityService.applyTemplate(tmpl.id, {
                    templateVersionId: tmpl.latestVersion.id,
                    userIds: [packageUserId],
                    reason: toggleReason,
                });
                const newCodes = new Set(userCapCodes);
                tmpl.latestVersion.items.forEach(i => newCodes.add(i.capabilityCode));
                setUserCapCodes(newCodes);
            } else {
                await capabilityService.revokeApplied(tmpl.id, {
                    userId: packageUserId,
                    reason: toggleReason,
                });
                const newCodes = new Set(userCapCodes);
                tmpl.latestVersion.items.forEach(i => newCodes.delete(i.capabilityCode));
                setUserCapCodes(newCodes);
            }
            setPendingToggle(null);
            setToggleReason('');
        } catch { alert('İşlem başarısız.'); }
        finally { setToggleLoading(false); }
    };

    return (
        <div className="p-6 md:p-10 animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900">Kullanıcılar</h1>
            </div>
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100">
                <div className="flex flex-col h-full">
                    {/* FİLTRE BÖLÜMÜ */}
                    <div className="mb-5 space-y-3">
                        {/* Hızlı Filtreler */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Hızlı:</span>
                            {[
                                { label: 'Banlı', active: userRoleFilter === 'banned', onClick: () => { const v = userRoleFilter === 'banned' ? '' : 'banned'; setUserRoleFilter(v); setTimeout(() => fetchUsers(1), 50); } },
                                { label: 'E-Posta Doğrulanmamış', active: userEmailFilter === 'unverified', onClick: () => { const v = userEmailFilter === 'unverified' ? '' : 'unverified'; setUserEmailFilter(v); setTimeout(() => fetchUsers(1), 50); } },
                                { label: 'Şikayet Edilmiş', active: isReportedFilter, onClick: () => { setIsReportedFilter(p => !p); setTimeout(() => fetchUsers(1), 50); } },
                                { label: 'Son 7 Gün', active: registeredAfterDays === 7, onClick: () => { setRegisteredAfterDays(p => p === 7 ? null : 7); setTimeout(() => fetchUsers(1), 50); } },
                                { label: 'Son 30 Gün', active: registeredAfterDays === 30, onClick: () => { setRegisteredAfterDays(p => p === 30 ? null : 30); setTimeout(() => fetchUsers(1), 50); } },
                            ].map(chip => (
                                <button
                                    key={chip.label}
                                    onClick={chip.onClick}
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition ${chip.active ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>

                        {/* Ana Filtre Satırı */}
                        <div className="flex flex-wrap gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <input
                                type="text"
                                placeholder="İsim, Kullanıcı Adı veya E-Posta..."
                                className="flex-1 min-w-[140px] sm:min-w-[200px] border border-slate-200 shadow-sm px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') fetchUsers(1); }}
                            />
                            <select className="border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); fetchUsers(1); }}>
                                <option value="">Tüm Roller</option>
                                <option value="admin">Admin</option>
                                <option value="expert">Uzman</option>
                                <option value="official">Resmi Makam</option>
                                <option value="banned">Banlı</option>
                            </select>
                            <select className="border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={userEmailFilter} onChange={e => { setUserEmailFilter(e.target.value); fetchUsers(1); }}>
                                <option value="">E-Posta (Tümü)</option>
                                <option value="verified">Doğrulanmış</option>
                                <option value="unverified">Doğrulanmamış</option>
                            </select>
                            <select className="border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={userInstitutionFilter} onChange={e => { setUserInstitutionFilter(e.target.value); fetchUsers(1); }}>
                                <option value="">Tüm Kurumlar</option>
                                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                            <select
                                className="border border-slate-200 shadow-sm px-3 py-2.5 rounded-xl text-sm bg-white font-medium text-slate-700"
                                value={sortBy}
                                onChange={e => { setSortBy(e.target.value); setTimeout(() => fetchUsers(1), 50); }}
                            >
                                <option value="registerDate_desc">Kayıt: Yeni → Eski</option>
                                <option value="registerDate_asc">Kayıt: Eski → Yeni</option>
                                <option value="name_asc">İsim: A → Z</option>
                                <option value="id_desc">ID: Büyük → Küçük</option>
                            </select>
                            <div className="flex gap-2 ml-auto">
                                <button onClick={() => fetchUsers(1)} className="px-4 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-sm shadow-md hover:bg-black transition">Ara</button>
                                {(userSearch || userRoleFilter || userEmailFilter || userInstitutionFilter || isReportedFilter || registeredAfterDays) && (
                                    <button onClick={() => { setUserSearch(''); setUserRoleFilter(''); setUserEmailFilter(''); setUserInstitutionFilter(''); setIsReportedFilter(false); setRegisteredAfterDays(null); setTimeout(() => fetchUsers(1), 50); }} className="px-3 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-50">✕</button>
                                )}
                            </div>
                            <span className="self-center text-xs font-bold text-slate-400">{userTotalCount} kullanıcı</span>
                        </div>
                    </div>

                    {/* TABLO */}
                    {userLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm flex-1 max-h-[600px] overflow-y-auto bg-slate-50/50">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Kullanıcı Bilgileri</th>
                                        <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">İletişim & Konum</th>
                                        <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Durum</th>
                                        <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">Yetki Yönetimi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {users.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500 font-medium">Kullanıcı bulunamadı.</td></tr>
                                    ) : users.map(u => (
                                        <tr key={u.id} className="hover:bg-indigo-50/30 transition">
                                            <td className="px-6 py-4">
                                                <Link to={`/user/${u.userName}`} target="_blank" className="flex items-center gap-3 group">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0 overflow-hidden ring-2 ring-white group-hover:ring-indigo-200 transition">
                                                        {u.profileImageUrl ? <img src={getProfileImageUrl(u.profileImageUrl)} className="w-full h-full object-cover" /> : u.userName[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition">@{u.userName}</div>
                                                        <div className="text-xs text-slate-500 font-medium">{u.name} {u.surname}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{u.id}</span>
                                                            {u.registerDate && (
                                                                <span className="text-[10px] text-slate-400">• {fmtDate(u.registerDate)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-700 font-medium">{u.email}</div>
                                                {u.cityName && (
                                                    <div className="text-xs text-slate-400 mt-0.5">📍 {u.cityName}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {u.isBanned
                                                        ? <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-[10px] font-black border border-red-200 tracking-wider uppercase">Banlı</span>
                                                        : <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded text-[10px] font-black border border-green-200 tracking-wider uppercase">Aktif</span>}
                                                    {u.isEmailVerified
                                                        ? <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black border border-blue-200 tracking-wider uppercase">✓ E-Posta</span>
                                                        : <span className="px-2.5 py-1 bg-yellow-50 text-yellow-600 rounded text-[10px] font-black border border-yellow-200 tracking-wider uppercase">! E-Posta</span>}
                                                    {u.isReported && (
                                                        <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-black border border-orange-200 tracking-wider uppercase">Şikayet</span>
                                                    )}
                                                    {!u.isProfilePublic && (
                                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black border border-slate-200 tracking-wider uppercase">Gizli</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    {(u.isBanned ? canUnban : canBan) && (
                                                        <button
                                                            onClick={() => handleBanToggle(u.id, u.isBanned)}
                                                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition shadow-sm active:scale-95 ${u.isBanned ? 'bg-slate-800 text-white border-slate-900 hover:bg-black' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}
                                                        >
                                                            {u.isBanned ? 'Ban Kaldır' : 'Banla'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleOpenMenu(u.id, e)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition text-base font-black leading-none"
                                                        title="Diğer işlemler"
                                                    >
                                                        ⋯
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PAGİNATION */}
                    <div className="flex justify-between items-center mt-4 px-2">
                        <button onClick={() => fetchUsers(userPage - 1)} disabled={userPage <= 1} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Önceki</button>
                        <span className="text-sm font-bold text-slate-600">Sayfa {userPage} / {userTotalPages} <span className="ml-2 text-slate-400 font-normal">({userTotalCount} toplam)</span></span>
                        <button onClick={() => fetchUsers(userPage + 1)} disabled={userPage >= userTotalPages} className="px-4 py-2 bg-white border rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm">Sonraki</button>
                    </div>
                </div>
            </div>

            {/* DROPDOWN AKSIYON MENÜSÜ (portal) */}
            {openMenuId !== null && menuPosition && (() => {
                const u = users.find(x => x.id === openMenuId);
                if (!u) return null;
                return createPortal(
                    <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenuId(null)} />
                        <div
                            className="fixed z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/40 py-1.5 min-w-[185px] animate-fade-in"
                            style={{ top: menuPosition.top, right: menuPosition.right }}
                        >
                            {canWarn && (
                                <button onClick={() => { setOpenMenuId(null); setWarningTargetUserId(u.id); setWarningTitle(''); setWarningMessage(''); setWarningSeverity('Warning'); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition flex items-center gap-2.5">
                                    <span>⚠️</span> Uyarı Ver
                                </button>
                            )}
                            {canWarnRead && (
                                <button onClick={() => { setOpenMenuId(null); handleOpenWarningHistory(u.id); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-2.5">
                                    <span>📋</span> Uyarı Geçmişi
                                </button>
                            )}
                            {(canWarn || canWarnRead) && (canImpersonate || canChangeInstitution || canTitleAssign || canCapabilityApply) && (
                                <div className="h-px bg-slate-100 my-1 mx-2" />
                            )}
                            {canImpersonate && (
                                <button onClick={() => { setOpenMenuId(null); setImpersonatingUser(u.id); setImpersonatePassword(''); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition flex items-center gap-2.5">
                                    <span>🔑</span> Sudo Geçiş
                                </button>
                            )}
                            {canChangeInstitution && (
                                <button onClick={() => { setOpenMenuId(null); setChangeInstUserId(u.id); setChangeInstTarget(''); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-sky-600 hover:bg-sky-50 transition flex items-center gap-2.5">
                                    <span>🏛️</span> Kurum Değiştir
                                </button>
                            )}
                            {(canImpersonate || canChangeInstitution) && (canTitleAssign || canCapabilityApply) && (
                                <div className="h-px bg-slate-100 my-1 mx-2" />
                            )}
                            {canTitleAssign && (
                                <button onClick={() => { setOpenMenuId(null); handleOpenTitleModal(u.id, u.userName); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 transition flex items-center gap-2.5">
                                    <span>🏷️</span> Unvan Yönetimi
                                </button>
                            )}
                            {canCapabilityApply && (
                                <button onClick={() => { setOpenMenuId(null); handleOpenPackages(u.id, u.userName); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition flex items-center gap-2.5">
                                    <span>📦</span> Yetenek Paketleri
                                </button>
                            )}
                        </div>
                    </>,
                    document.body
                );
            })()}

            {/* IMPERSONATION MODAL */}
            {impersonatingUser !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-down border-2 border-amber-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 flex items-center justify-center rounded-full mb-4 shadow-inner"><span className="text-3xl">⚠️</span></div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">SUDO Mode Aktif</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6">Başka bir kullanıcının oturumuna geçiş yapmak üzeresiniz. Lütfen işlemi onaylamak için <strong className="text-slate-800">kendi Admin parolanızı</strong> girin.</p>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!impersonatePassword) return;
                            try {
                                const response = await adminService.impersonateUser({ targetUserId: impersonatingUser, adminPassword: impersonatePassword });
                                if (response.data.success) { localStorage.setItem('isImpersonating', 'true'); window.location.href = '/'; }
                                else alert(response.data.message || 'Geçiş başarısız.');
                            } catch (err: any) {
                                let errMsg = 'Geçiş başarısız. Şifreyi kontrol ediniz.';
                                if (err.response?.data) { if (typeof err.response.data === 'string') errMsg = err.response.data; else if (err.response.data.message) errMsg = err.response.data.message; }
                                alert(errMsg);
                            }
                        }} className="space-y-4">
                            <input type="password" required autoFocus placeholder="Admin Parolanız..." value={impersonatePassword} onChange={e => setImpersonatePassword(e.target.value)} className="w-full border-2 border-slate-200 shadow-sm rounded-xl px-4 py-3 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 outline-none text-sm bg-slate-50 font-medium text-slate-800 text-center" />
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setImpersonatingUser(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">İptal</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-md hover:bg-amber-600 transition active:scale-95">Kimliğe Bürü</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* KURUM DEĞİŞTİR MODAL */}
            {changeInstUserId !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-down border-2 border-sky-200">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 bg-sky-100 text-sky-600 flex items-center justify-center rounded-2xl shadow-inner shrink-0 text-2xl">🏛️</div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Kurum Değiştir</h3>
                                <p className="text-xs text-slate-500">Kullanıcı ID: {changeInstUserId}</p>
                            </div>
                        </div>
                        <form onSubmit={handleChangeInstitution} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Yeni Kurum</label>
                                <select
                                    required
                                    value={changeInstTarget}
                                    onChange={e => setChangeInstTarget(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-sky-400 outline-none bg-slate-50"
                                >
                                    <option value="">— Kurum seçin —</option>
                                    {institutions.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setChangeInstUserId(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">İptal</button>
                                <button type="submit" disabled={changeInstLoading || !changeInstTarget} className="flex-1 px-4 py-3 bg-sky-600 text-white font-bold rounded-xl shadow-md hover:bg-sky-700 transition active:scale-95 disabled:opacity-50">
                                    {changeInstLoading ? 'Değiştiriliyor...' : 'Uygula'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* UYARI VER MODAL */}
            {warningTargetUserId !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in-down border-2 border-orange-200">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 flex items-center justify-center rounded-2xl shadow-inner shrink-0"><span className="text-2xl">⚠️</span></div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Kullanıcıya Uyarı Gönder</h3>
                                <p className="text-xs text-slate-500 font-medium">Bu uyarı kullanıcıya bildirim olarak da iletilecek.</p>
                            </div>
                        </div>
                        <form onSubmit={handleIssueWarning} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Başlık</label>
                                <input type="text" required value={warningTitle} onChange={e => setWarningTitle(e.target.value)} placeholder="Örn: Kural İhlali, Spam..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none bg-slate-50 font-medium text-slate-800" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Mesaj</label>
                                <textarea required rows={3} value={warningMessage} onChange={e => setWarningMessage(e.target.value)} placeholder="Detaylı açıklama..." className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none bg-slate-50 font-medium text-slate-800 resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Seviye</label>
                                <select value={warningSeverity} onChange={e => setWarningSeverity(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-orange-400 outline-none bg-slate-50 font-medium text-slate-800">
                                    <option value="Info">ℹ️ Bilgi</option>
                                    <option value="Warning">⚠️ Uyarı</option>
                                    <option value="Severe">🚨 Ciddi</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setWarningTargetUserId(null)} className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">İptal</button>
                                <button type="submit" disabled={warningLoading} className="flex-1 px-4 py-3 bg-orange-500 text-white font-black rounded-xl shadow-md hover:bg-orange-600 transition active:scale-95 disabled:opacity-50">{warningLoading ? 'Gönderiliyor...' : 'Uyarı Gönder'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* UYARI GEÇMİŞİ MODAL */}
            {warningHistoryUserId !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-down border border-slate-200">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-black text-slate-800">📋 Uyarı Geçmişi</h3>
                            <button onClick={() => setWarningHistoryUserId(null)} className="text-slate-400 hover:text-slate-700 transition text-xl leading-none">✕</button>
                        </div>
                        {warningHistoryLoading ? (
                            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" /></div>
                        ) : warningHistory.length === 0 ? (
                            <p className="text-center text-slate-400 font-medium py-8">Bu kullanıcıya ait uyarı kaydı yok.</p>
                        ) : (
                            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                {warningHistory.map((w: any) => (
                                    <div key={w.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${w.isActive ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                        <span className="text-xl mt-0.5 shrink-0">{w.severity === 'Severe' ? '🚨' : w.severity === 'Warning' ? '⚠️' : 'ℹ️'}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-slate-800 text-sm">{w.title}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${w.severity === 'Severe' ? 'bg-red-100 text-red-700' : w.severity === 'Warning' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{w.severity}</span>
                                                {!w.isActive && <span className="text-[10px] text-slate-400 font-bold uppercase">Geri Alındı</span>}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{w.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{fmtDateTime(w.issuedAt)}</p>
                                        </div>
                                        {w.isActive && canWarnRevoke && (
                                            <button onClick={() => handleRevokeWarning(w.id)} className="shrink-0 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">Geri Al</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* UNVAN YÖNETİMİ MODAL */}
            {titleUserId !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in-down border-2 border-violet-200">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-violet-100 text-violet-600 flex items-center justify-center rounded-2xl shadow-inner shrink-0 text-2xl">🏷️</div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Unvan Yönetimi</h3>
                                    <p className="text-xs text-slate-500">@{titleUserName}</p>
                                </div>
                            </div>
                            <button onClick={() => setTitleUserId(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                        </div>

                        {/* Mevcut unvanlar */}
                        <div className="mb-5">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Mevcut Unvanlar</label>
                            {titlesLoading ? (
                                <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-violet-500" /></div>
                            ) : userTitles.length === 0 ? (
                                <p className="text-xs text-slate-400 font-medium py-2">Henüz unvan atanmamış.</p>
                            ) : (
                                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                    {userTitles.map(t => (
                                        <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-2">
                                                {t.icon && <span>{t.icon}</span>}
                                                <span
                                                    className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                                                    style={t.color ? { backgroundColor: `${t.color}22`, color: t.color } : undefined}
                                                >
                                                    {t.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">{t.kind}</span>
                                            </div>
                                            <button onClick={() => handleRemoveTitle(t.id)} className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition">Kaldır</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Yeni unvan ekle */}
                        <form onSubmit={handleAssignTitle} className="space-y-3 border-t border-slate-100 pt-4">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">Yeni Unvan Ekle</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    placeholder="Unvan adı..."
                                    value={newTitleLabel}
                                    onChange={e => setNewTitleLabel(e.target.value)}
                                    className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-violet-400 outline-none bg-slate-50"
                                />
                                <select
                                    value={newTitleKind}
                                    onChange={e => setNewTitleKind(e.target.value as 'official' | 'expert' | 'custom')}
                                    className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-violet-400 outline-none bg-slate-50"
                                >
                                    <option value="custom">Özel</option>
                                    <option value="expert">Uzman</option>
                                    <option value="official">Yetkili</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                    <label className="text-xs font-bold text-slate-500">Renk:</label>
                                    <input type="color" value={newTitleColor || '#6d28d9'} onChange={e => setNewTitleColor(e.target.value)} className="h-8 w-12 rounded cursor-pointer border border-slate-200" />
                                    {newTitleColor && <button type="button" onClick={() => setNewTitleColor('')} className="text-[10px] text-slate-400 hover:text-slate-600">Temizle</button>}
                                </div>
                                <input
                                    type="text"
                                    placeholder="İkon (emoji)"
                                    value={newTitleIcon}
                                    onChange={e => setNewTitleIcon(e.target.value)}
                                    className="w-28 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-violet-400 outline-none bg-slate-50"
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setTitleUserId(null)} className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition text-sm">Kapat</button>
                                <button type="submit" disabled={titleSubmitting || !newTitleLabel.trim()} className="flex-1 px-4 py-2.5 bg-violet-600 text-white font-black rounded-xl shadow-md hover:bg-violet-700 transition active:scale-95 disabled:opacity-50 text-sm">
                                    {titleSubmitting ? 'Ekleniyor...' : 'Ekle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* YETENEK PAKETLERİ MODAL */}
            {packageUserId !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-in-down border-2 border-teal-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-teal-100 text-teal-600 flex items-center justify-center rounded-2xl shadow-inner shrink-0 text-2xl">📦</div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Yetenek Paketleri</h3>
                                    <p className="text-xs text-slate-500">@{packageUserName}</p>
                                </div>
                            </div>
                            <button onClick={() => setPackageUserId(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {packageLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-500" />
                                </div>
                            ) : packageTemplates.length === 0 ? (
                                <p className="text-center text-slate-400 font-medium py-8">Henüz yetenek paketi tanımlanmamış.</p>
                            ) : (
                                <div className="space-y-3">
                                    {packageTemplates.map(tmpl => {
                                        const active = isPackageActive(tmpl);
                                        const isPending = pendingToggle?.templateId === tmpl.id;
                                        return (
                                            <div key={tmpl.id} className={`rounded-2xl border p-4 transition ${active ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-black text-slate-800 text-sm">{tmpl.name}</span>
                                                            {tmpl.latestVersion && (
                                                                <span className="text-[9px] text-slate-400 font-mono">{tmpl.latestVersion.items.length} yetki</span>
                                                            )}
                                                        </div>
                                                        {tmpl.description && (
                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{tmpl.description}</p>
                                                        )}
                                                    </div>
                                                    {/* Toggle switch */}
                                                    <button
                                                        onClick={() => !isPending && handleTogglePackage(tmpl)}
                                                        className={`relative shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${active ? 'bg-teal-500' : 'bg-slate-300'}`}
                                                        title={active ? 'Paketi kaldır' : 'Paketi uygula'}
                                                    >
                                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${active ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                {/* Inline reason dialog */}
                                                {isPending && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                                        <p className="text-xs font-bold text-slate-600">
                                                            {pendingToggle!.action === 'apply' ? '✅ Paketi ekle — gerekçe girin:' : '❌ Paketi kaldır — gerekçe girin:'}
                                                        </p>
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={toggleReason}
                                                            onChange={e => setToggleReason(e.target.value)}
                                                            placeholder="Gerekçe..."
                                                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-400 outline-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPendingToggle(null)}
                                                                className="flex-1 px-3 py-1.5 text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                                                            >
                                                                İptal
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleConfirmToggle}
                                                                disabled={toggleLoading || !toggleReason.trim()}
                                                                className={`flex-1 px-3 py-1.5 text-[10px] font-black uppercase rounded-xl transition disabled:opacity-50 ${pendingToggle!.action === 'apply' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                                                            >
                                                                {toggleLoading ? '...' : pendingToggle!.action === 'apply' ? 'Uygula' : 'Kaldır'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
                            <button
                                onClick={() => setPackageUserId(null)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition text-sm"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
