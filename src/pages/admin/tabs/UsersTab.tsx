import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { userService } from '../../../services/userService';
import { institutionService } from '../../../services/institutionService';
import type { UserDetailDto, Institution } from '../../../types';
import { getProfileImageUrl } from '../../../utils/imageUtils';
import { useCapability } from '../../../hooks/useCapability';
import { fmtDateTime } from '../../../utils/dateFormat';

export default function UsersTab() {
    const canBan        = useCapability('admin.user_ban');
    const canUnban      = useCapability('admin.user_unban');
    const canWarn       = useCapability('moderation.user_warn');
    const canImpersonate = useCapability('admin.user_impersonate');
    const canWarnRead   = useCapability('moderation.user_warn_read');
    const canWarnRevoke = useCapability('moderation.user_warn_revoke');
    const [users, setUsers] = useState<UserDetailDto[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('');
    const [userEmailFilter, setUserEmailFilter] = useState('');
    const [userInstitutionFilter, setUserInstitutionFilter] = useState('');
    const [userPage, setUserPage] = useState(1);
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

    useEffect(() => {
        institutionService.getAll().then(res => { if (res.data.success) setInstitutions(res.data.data); });
        fetchUsers(1);
    }, []);

    const fetchUsers = async (page: number = 1) => {
        setUserLoading(true);
        try {
            const res = await userService.getAllPaged({
                page,
                pageSize: USER_PAGE_SIZE,
                searchText: userSearch || undefined,
                roleFilter: userRoleFilter || undefined,
                emailStatus: userEmailFilter || undefined,
                institutionId: userInstitutionFilter ? parseInt(userInstitutionFilter) : undefined,
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

    return (
        <div className="p-6 md:p-10 animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900">Kullanıcılar</h1>
            </div>
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100">
                <div className="flex flex-col h-full">
                    {/* FİLTRE BÖLÜMÜ */}
                    <div className="flex flex-wrap gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <input
                            type="text"
                            placeholder="İsim, Kullanıcı Adı veya E-Posta Ara..."
                            className="flex-1 min-w-[140px] sm:min-w-[200px] border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') fetchUsers(1); }}
                        />
                        <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); fetchUsers(1); }}>
                            <option value="">Tüm Roller</option>
                            <option value="admin">Admin</option>
                            <option value="expert">Uzman</option>
                            <option value="official">Resmi Makam</option>
                            <option value="banned">Banlı</option>
                        </select>
                        <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={userEmailFilter} onChange={e => { setUserEmailFilter(e.target.value); fetchUsers(1); }}>
                            <option value="">E-Posta Durumu (Tümü)</option>
                            <option value="verified">Doğrulanmış</option>
                            <option value="unverified">Doğrulanmamış</option>
                        </select>
                        <select className="border border-slate-200 shadow-sm p-3.5 rounded-xl text-sm bg-white font-medium text-slate-700" value={userInstitutionFilter} onChange={e => { setUserInstitutionFilter(e.target.value); fetchUsers(1); }}>
                            <option value="">Tüm Kurumlar</option>
                            {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        <button onClick={() => fetchUsers(1)} className="px-5 py-3 bg-slate-800 text-white font-bold rounded-xl text-sm shadow-md hover:bg-black transition">Ara</button>
                        {(userSearch || userRoleFilter || userEmailFilter || userInstitutionFilter) && (
                            <button onClick={() => { setUserSearch(''); setUserRoleFilter(''); setUserEmailFilter(''); setUserInstitutionFilter(''); setTimeout(() => fetchUsers(1), 50); }} className="px-4 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-50">Temizle</button>
                        )}
                        <span className="self-center text-xs font-bold text-slate-500 ml-auto">{userTotalCount} kullanıcı bulundu</span>
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
                                        <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">E-Posta</th>
                                        <th className="px-6 py-4 text-left font-black text-slate-500 uppercase tracking-widest text-[10px]">Roller & Durum</th>
                                        <th className="px-6 py-4 text-right font-black text-slate-500 uppercase tracking-widest text-[10px]">Yetki Yönetimi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {users.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-500 font-medium">Kullanıcı bulunamadı.</td></tr>
                                    ) : users.map(u => (
                                        <tr key={u.id} className="hover:bg-indigo-50/30 transition">
                                            <td className="px-6 py-4">
                                                <Link to={`/user/${u.id}`} target="_blank" className="flex items-center gap-3 group">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-sm shrink-0 overflow-hidden ring-2 ring-white group-hover:ring-indigo-200 transition">
                                                        {u.profileImageUrl ? <img src={getProfileImageUrl(u.profileImageUrl)} className="w-full h-full object-cover" /> : u.userName[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition">@{u.userName}</div>
                                                        <div className="text-xs text-slate-500 font-medium">{u.name} {u.surname}</div>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{u.email}</td>
                                            <td className="px-6 py-4 flex gap-1.5 flex-wrap">
                                                {u.isBanned
                                                    ? <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-[10px] font-black border border-red-200 tracking-wider uppercase">Banlı</span>
                                                    : <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded text-[10px] font-black border border-green-200 tracking-wider uppercase">Aktif</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 flex-wrap items-center">
                                                    {(u.isBanned ? canUnban : canBan) && (
                                                    <button onClick={() => handleBanToggle(u.id, u.isBanned)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition shadow-sm active:scale-95 ${u.isBanned ? 'bg-slate-800 text-white border-slate-900 hover:bg-black' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}>
                                                        {u.isBanned ? 'Ban Kaldır' : 'Banla'}
                                                    </button>
                                                )}
                                                    <div className="w-px h-5 bg-slate-200 mx-1" />
                                                    {canWarn && (
                                                    <button onClick={() => { setWarningTargetUserId(u.id); setWarningTitle(''); setWarningMessage(''); setWarningSeverity('Warning'); }} className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition shadow-sm active:scale-95 bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100">⚠️ Uyar</button>
                                                    )}
                                                    {canWarnRead && (
                                                    <button onClick={() => handleOpenWarningHistory(u.id)} className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition shadow-sm active:scale-95 bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">📋 Geçmiş</button>
                                                    )}
                                                    <div className="w-px h-5 bg-slate-200 mx-1" />
                                                    {canImpersonate && (
                                                    <button onClick={() => { setImpersonatingUser(u.id); setImpersonatePassword(''); }} className="px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-wider transition active:scale-95">
                                                        Sudo Geçiş
                                                    </button>
                                                    )}
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
        </div>
    );
}
