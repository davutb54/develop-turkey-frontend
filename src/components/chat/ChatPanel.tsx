import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { userService } from '../../services/userService';
import type { ConversationSummary, ConversationDetail, UserDetailDto } from '../../types';

// ── Yardımcı: backend'den gelen UTC timestamp'i doğru parse et (Z eksik olabilir)
const toDate = (s: string) =>
    new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');

// ── Sabitler ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string>  = { active: 'Aktif', pending: 'Bekliyor', closed: 'Kapalı' };
const STATUS_COLOR: Record<string, string>  = {
    active:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/20   text-amber-400   border-amber-500/30',
    closed:  'bg-gray-500/20    text-gray-400    border-gray-500/30',
};
const CAT_LABEL: Record<string, string>  = {
    general:   'Genel',
    official:  'Yetkili',
    expert:    'Yönetici',
    moderator: 'Admin',
    admin:     'Global Admin',
};
const CAT_COLOR: Record<string, string>  = {
    general:   'text-blue-400   bg-blue-500/10',
    official:  'text-blue-400   bg-blue-500/10',
    expert:    'text-purple-400 bg-purple-500/10',
    moderator: 'text-orange-400 bg-orange-500/10',
    admin:     'text-red-400    bg-red-500/10',
};
const TYPE_ICON: Record<string, string> = { direct: '💬', group: '👥', support: '🎧' };

type FilterType   = 'all' | 'direct' | 'group' | 'support';
type FilterStatus = 'all' | 'active' | 'pending' | 'closed';

// ── Mesaj baloncuğu ───────────────────────────────────────────────────────────
const MessageBubble: React.FC<{
    msg: { id: number; senderUserId: number; senderUsername: string; body: string; createdAt: string; isDeleted: boolean };
    isMine: boolean;
    canDeleteMsg: boolean;
    onDelete: () => void;
}> = ({ msg, isMine, canDeleteMsg, onDelete }) => (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5 group`}>
        <div className={`relative max-w-[72%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${isMine ? 'bg-[#6c63ff] text-white' : 'bg-[#252535] text-gray-100 border border-white/5'}`}>
            {!isMine && <p className="text-[10px] text-[#9999cc] mb-0.5 font-semibold">{msg.senderUsername}</p>}
            <p className={msg.isDeleted ? 'italic text-xs opacity-60' : ''}>
                {msg.isDeleted ? '🗑 Mesaj silindi.' : msg.body}
            </p>
            <p className="text-[10px] mt-0.5 opacity-50 text-right">
                {toDate(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {canDeleteMsg && !msg.isDeleted && (
                <button
                    onClick={onDelete}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 bg-red-500/80 hover:bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center transition-all"
                    title="Mesajı sil"
                >×</button>
            )}
        </div>
    </div>
);

// ── Konuşma listesi satırı ────────────────────────────────────────────────────
const ConvItem: React.FC<{
    conv: ConversationSummary;
    isActive: boolean;
    onClick: () => void;
}> = ({ conv, isActive, onClick }) => {
    const icon = TYPE_ICON[conv.type] ?? '💬';
    const name = conv.title ?? (conv.type === 'direct' ? `DM #${conv.id}` : `Konuşma #${conv.id}`);
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 group
                ${isActive ? 'bg-[#6c63ff]/20 text-white ring-1 ring-[#6c63ff]/40' : 'text-gray-300 hover:bg-white/5'}
                ${conv.status === 'closed' ? 'opacity-50' : ''}`}
        >
            <span className="text-base leading-none flex-shrink-0 mt-0.5">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate leading-tight">{name}</p>
                    {conv.status !== 'active' && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${STATUS_COLOR[conv.status]}`}>
                            {STATUS_LABEL[conv.status]}
                        </span>
                    )}
                </div>
                {conv.type === 'support' && conv.supportCategory && (
                    <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 ${CAT_COLOR[conv.supportCategory] ?? ''}`}>
                        {CAT_LABEL[conv.supportCategory]}
                    </span>
                )}
                {conv.lastMessage && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{conv.lastMessage.body}</p>
                )}
            </div>
            {conv.unreadCount > 0 && (
                <span className="bg-[#6c63ff] text-white text-[9px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0 mt-1 font-bold">
                    {conv.unreadCount}
                </span>
            )}
        </button>
    );
};

// ── Destek havuzu satırı ──────────────────────────────────────────────────────
const PoolItem: React.FC<{
    conv: ConversationSummary;
    onClaim: () => void;
    isClaiming: boolean;
}> = ({ conv, onClaim, isClaiming }) => (
    <div className="bg-[#1e1e2e] border border-white/8 rounded-xl p-3 space-y-2 hover:border-white/15 transition-colors">
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{conv.title ?? `Talep #${conv.id}`}</p>
                <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 ${CAT_COLOR[conv.supportCategory ?? ''] ?? 'text-gray-400 bg-white/5'}`}>
                    {CAT_LABEL[conv.supportCategory ?? ''] ?? conv.supportCategory ?? 'Genel'}
                </span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border flex-shrink-0 ${STATUS_COLOR[conv.status]}`}>
                {STATUS_LABEL[conv.status]}
            </span>
        </div>
        <p className="text-[10px] text-gray-500">
            {toDate(conv.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            {conv.assignedToUsername && <span className="text-[#9999cc]"> · {conv.assignedToUsername}</span>}
        </p>
        {conv.status === 'pending' && (
            <button onClick={onClaim} disabled={isClaiming}
                className="w-full bg-[#6c63ff] hover:bg-[#7b72ff] disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors">
                {isClaiming ? '…' : '✋ Sahiplen'}
            </button>
        )}
    </div>
);

// ── Ayarlar Paneli ────────────────────────────────────────────────────────────
const SettingsPanel: React.FC<{
    conv: ConversationDetail;
    myUserId: number;
    canManage: boolean;
    onClose: () => void;
    onConvClose: () => void;
    onConvDelete: () => void;
    onLeave: () => void;
    onRefresh: () => void;
}> = ({ conv, myUserId, canManage, onClose, onConvClose, onConvDelete, onLeave, onRefresh }) => {
    const [userSearch, setUserSearch]   = useState('');
    const [results, setResults]         = useState<UserDetailDto[]>([]);
    const [searching, setSearching]     = useState(false);
    const [addingId, setAddingId]       = useState<number | null>(null);
    const [removingId, setRemovingId]   = useState<number | null>(null);
    const [editTitle, setEditTitle]     = useState(conv.title ?? '');
    const [savingTitle, setSavingTitle] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userSearch.length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const r = await userService.getAllPaged({ searchText: userSearch, pageSize: 8 });
                if (r.data.success) {
                    const items: UserDetailDto[] = r.data.data.items ?? r.data.data ?? [];
                    setResults(items.filter(u => !conv.participants.find(p => p.userId === u.id)));
                }
            } catch { /* sessiz */ } finally { setSearching(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [userSearch, conv.participants]);

    const handleAdd = async (user: UserDetailDto) => {
        setAddingId(user.id);
        try {
            await chatService.addParticipant(conv.id, user.id);
            setUserSearch(''); setResults([]);
            onRefresh();
        } catch { /* sessiz */ } finally { setAddingId(null); }
    };

    const handleRemove = async (userId: number) => {
        setRemovingId(userId);
        try {
            await chatService.removeParticipant(conv.id, userId);
            onRefresh();
        } catch { /* sessiz */ } finally { setRemovingId(null); }
    };

    const handleSaveTitle = async () => {
        if (!editTitle.trim() || editTitle === conv.title) return;
        setSavingTitle(true);
        try { await chatService.updateTitle(conv.id, editTitle.trim()); onRefresh(); }
        catch { /* sessiz */ } finally { setSavingTitle(false); }
    };

    return (
        <div className="w-72 flex-shrink-0 border-l border-white/10 flex flex-col bg-[#0f0f1a]">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-bold text-white">Konuşma Ayarları</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Durum */}
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Durum</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_COLOR[conv.status]}`}>
                            {STATUS_LABEL[conv.status]}
                        </span>
                        {conv.type === 'support' && conv.supportCategory && (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${CAT_COLOR[conv.supportCategory] ?? ''}`}>
                                {CAT_LABEL[conv.supportCategory]}
                            </span>
                        )}
                    </div>
                    {conv.type === 'support' && conv.assignedToUsername && (
                        <p className="text-xs text-gray-400 mt-2">Yetkili: <span className="text-white font-medium">{conv.assignedToUsername}</span></p>
                    )}
                </div>

                {/* Başlık düzenleme */}
                {canManage && (conv.type === 'group' || conv.type === 'support') && (
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Başlık</p>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#6c63ff]"
                            />
                            <button
                                onClick={handleSaveTitle}
                                disabled={savingTitle || !editTitle.trim()}
                                className="bg-[#6c63ff] hover:bg-[#7b72ff] disabled:opacity-40 text-white text-xs px-3 rounded-lg transition-colors font-medium"
                            >
                                {savingTitle ? '…' : '✓'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Katılımcılar */}
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                        Katılımcılar <span className="text-gray-600">({conv.participants.length})</span>
                    </p>
                    <div className="space-y-1.5">
                        {conv.participants.map(p => (
                            <div key={p.userId} className="flex items-center justify-between gap-2 py-1">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-[#6c63ff]/25 flex items-center justify-center text-xs text-[#b0aaff] font-bold flex-shrink-0">
                                        {p.username[0]?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-white truncate">{p.username}</p>
                                        {p.role === 'admin' && <p className="text-[9px] text-[#9999cc]">Yönetici</p>}
                                    </div>
                                </div>
                                {(canManage || p.userId === myUserId) && p.userId !== myUserId && (
                                    <button
                                        onClick={() => handleRemove(p.userId)}
                                        disabled={removingId === p.userId}
                                        className="text-red-400 hover:text-red-300 text-xs flex-shrink-0 disabled:opacity-40 hover:bg-red-500/10 rounded px-1 py-0.5 transition-colors"
                                        title="Çıkar"
                                    >
                                        {removingId === p.userId ? '…' : '✕'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {canManage && conv.status !== 'closed' && (
                        <div ref={searchRef} className="relative mt-3">
                            <input
                                type="text"
                                placeholder="Kullanıcı ekle…"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#6c63ff]"
                            />
                            {searching && <span className="absolute right-2 top-1.5 text-gray-400 text-[10px]">…</span>}
                            {results.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                                    {results.map(u => (
                                        <button key={u.id} onMouseDown={() => handleAdd(u)} disabled={addingId === u.id}
                                            className="w-full text-left px-3 py-2 hover:bg-white/5 text-xs flex items-center justify-between transition-colors">
                                            <span className="text-white font-medium">{u.userName}</span>
                                            <span className="text-gray-400 text-[10px]">{addingId === u.id ? '…' : '+ Ekle'}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Alt aksiyonlar */}
            <div className="p-4 border-t border-white/10 space-y-2 flex-shrink-0">
                {conv.status !== 'closed' && (
                    <button onClick={onConvClose}
                        className="w-full bg-amber-600/15 hover:bg-amber-600/25 text-amber-400 text-xs font-semibold py-2.5 rounded-xl transition-colors border border-amber-600/20">
                        🔒 Konuşmayı Kapat
                    </button>
                )}
                {canManage && (
                    confirmDelete ? (
                        <div className="space-y-1.5">
                            <p className="text-xs text-red-400 text-center font-medium">Konuşmayı silmek istediğinizden emin misiniz?</p>
                            <div className="flex gap-2">
                                <button onClick={onConvDelete}
                                    className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded-xl transition-colors">
                                    Evet, Sil
                                </button>
                                <button onClick={() => setConfirmDelete(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs py-2 rounded-xl transition-colors">
                                    İptal
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setConfirmDelete(true)}
                            className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-semibold py-2.5 rounded-xl transition-colors border border-red-600/20">
                            🗑️ Konuşmayı Sil
                        </button>
                    )
                )}
                <button onClick={onLeave}
                    className="w-full bg-white/5 hover:bg-white/10 text-gray-400 text-xs py-2.5 rounded-xl transition-colors">
                    ← Ayrıl
                </button>
            </div>
        </div>
    );
};

// ── Ana Panel ─────────────────────────────────────────────────────────────────
const ChatPanel: React.FC = () => {
    const { userId, hasCapability } = useAuth();
    const {
        conversations, supportPool,
        messages, activeConversationId,
        setActiveConversation, sendMessage, markRead, loadHistory,
        refreshConversations, refreshPool,
        createSupport, claimConversation, closeConversation, deleteConversation,
        isConnected,
    } = useChat();

    const myUserId  = userId ? Number(userId) : -1;
    const canManage = hasCapability('chat.institution_manage') || hasCapability('chat.global_manage');
    const isStaff   = canManage
                   || hasCapability('chat.handle_support')
                   || hasCapability('chat.handle_escalations');
    const canDeleteMsg = canManage;

    // ── Filters ───────────────────────────────────────────────────────────────
    const [filterType,   setFilterType]   = useState<FilterType>('all');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [filterSearch, setFilterSearch] = useState('');

    const filteredConvs = useMemo(() => {
        return conversations.filter(c => {
            if (filterType   !== 'all' && c.type   !== filterType)   return false;
            if (filterStatus !== 'all' && c.status !== filterStatus) return false;
            if (filterSearch.trim()) {
                const q = filterSearch.toLowerCase();
                const title = (c.title ?? '').toLowerCase();
                if (!title.includes(q) && !`#${c.id}`.includes(q)) return false;
            }
            return true;
        });
    }, [conversations, filterType, filterStatus, filterSearch]);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [tab, setTab]                     = useState<'mine' | 'pool'>('mine');
    const [input, setInput]                 = useState('');
    const [sending, setSending]             = useState(false);
    const [loadingMore, setLoadingMore]     = useState(false);
    const [hasMore, setHasMore]             = useState(false);
    const [showSettings, setShowSettings]   = useState(false);
    const [convDetail, setConvDetail]       = useState<ConversationDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [claimingId, setClaimingId]       = useState<number | null>(null);
    const [creatingSupport, setCreatingSupport] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConv  = conversations.find(c => c.id === activeConversationId) ?? null;
    const currentMsgs = activeConversationId ? (messages[activeConversationId] ?? []) : [];
    const isClosed    = activeConv?.status === 'closed';

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMsgs.length]);

    useEffect(() => {
        if (!activeConversationId || currentMsgs.length === 0) return;
        const last = currentMsgs[currentMsgs.length - 1];
        if (last) markRead(activeConversationId, last.id);
    }, [activeConversationId, currentMsgs.length, markRead]);

    const openSettings = useCallback(async () => {
        if (!activeConversationId) return;
        setLoadingDetail(true);
        try {
            const r = await chatService.getDetail(activeConversationId);
            if (r.data.success) setConvDetail(r.data.data);
        } catch { /* sessiz */ } finally { setLoadingDetail(false); }
        setShowSettings(true);
    }, [activeConversationId]);

    const refreshDetail = useCallback(async () => {
        if (!activeConversationId) return;
        try {
            const r = await chatService.getDetail(activeConversationId);
            if (r.data.success) setConvDetail(r.data.data);
        } catch { /* sessiz */ }
        refreshConversations();
    }, [activeConversationId, refreshConversations]);

    const handleSend = async () => {
        if (!activeConversationId || !input.trim() || sending || isClosed) return;
        setSending(true);
        try { await sendMessage(activeConversationId, input.trim()); setInput(''); }
        catch { /* sessiz */ } finally { setSending(false); }
    };

    const handleLoadMore = async () => {
        if (!activeConversationId || loadingMore || currentMsgs.length === 0) return;
        setLoadingMore(true);
        const more = await loadHistory(activeConversationId, currentMsgs[0]?.id);
        setHasMore(more);
        setLoadingMore(false);
    };

    const handleClaim = async (id: number) => {
        setClaimingId(id);
        const ok = await claimConversation(id);
        setClaimingId(null);
        if (ok) { setTab('mine'); await refreshPool(); }
    };

    const handleCreateSupport = async (cat: 'general' | 'expert' | 'moderator' | 'admin') => {
        setCreatingSupport(cat);
        const conv = await createSupport(cat);
        setCreatingSupport(null);
        if (conv) setActiveConversation(conv.id);
    };

    const handleCloseConversation = async () => {
        if (!activeConversationId) return;
        await closeConversation(activeConversationId);
        setShowSettings(false);
    };

    const handleDeleteConversation = async () => {
        if (!activeConversationId) return;
        const ok = await deleteConversation(activeConversationId);
        if (ok) {
            setShowSettings(false);
            setActiveConversation(null);
        }
    };

    const handleLeave = async () => {
        if (!activeConversationId) return;
        await chatService.removeParticipant(activeConversationId, myUserId);
        setActiveConversation(null);
        setShowSettings(false);
        refreshConversations();
    };

    const handleDeleteMsg = async (messageId: number) => {
        try { await chatService.deleteMessage(messageId); refreshConversations(); }
        catch { /* sessiz */ }
    };

    // Destek butonları
    const showGeneral     = hasCapability('chat.support_request');
    const showEscalate    = hasCapability('chat.escalate');
    const showAdmin       = hasCapability('chat.contact_admin');
    const showGlobalAdmin = hasCapability('chat.contact_global_admin');
    const anySupport      = showGeneral || showEscalate || showAdmin || showGlobalAdmin;

    // Pool kategori filter
    const pendingCount = supportPool.filter(c => c.status === 'pending').length;

    return (
        <div className="flex h-full bg-[#0f0f1a] text-white rounded-2xl overflow-hidden border border-white/8 shadow-2xl">

            {/* ── Sol panel ─────────────────────────────────────────────────── */}
            <div className="w-72 flex-shrink-0 border-r border-white/8 flex flex-col bg-[#13131f]">

                {/* Header */}
                <div className="px-4 py-3.5 border-b border-white/8 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <span className="font-bold text-sm text-white">Sohbetler</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => refreshConversations()} className="text-gray-500 hover:text-gray-300 text-xs transition-colors" title="Yenile">↻</button>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400' : 'bg-gray-500'}`} title={isConnected ? 'Bağlı' : 'Bağlantı yok'} />
                    </div>
                </div>

                {/* Tab seçici */}
                {isStaff && (
                    <div className="flex border-b border-white/8 flex-shrink-0">
                        {(['mine', 'pool'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`flex-1 text-xs py-2.5 font-medium transition-all ${tab === t ? 'text-white border-b-2 border-[#6c63ff] bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
                                {t === 'mine' ? 'Sohbetlerim' : `Havuz${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search + filter (only for "mine" tab) */}
                {tab === 'mine' && (
                    <div className="px-3 pt-2.5 pb-2 border-b border-white/8 space-y-2 flex-shrink-0">
                        <input
                            type="text"
                            placeholder="Ara…"
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#6c63ff]"
                        />
                        <div className="flex gap-1.5">
                            {(['all', 'direct', 'group', 'support'] as FilterType[]).map(t => (
                                <button key={t} onClick={() => setFilterType(t)}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${filterType === t ? 'bg-[#6c63ff] text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}>
                                    {t === 'all' ? 'Tümü' : t === 'direct' ? 'DM' : t === 'group' ? 'Grup' : 'Destek'}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1.5">
                            {(['all', 'active', 'pending', 'closed'] as FilterStatus[]).map(s => (
                                <button key={s} onClick={() => setFilterStatus(s)}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${filterStatus === s ? 'bg-[#6c63ff] text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}>
                                    {s === 'all' ? 'Tümü' : STATUS_LABEL[s]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Destek talep butonları */}
                {tab === 'mine' && anySupport && (
                    <div className="px-3 py-2 border-b border-white/8 space-y-1 flex-shrink-0">
                        <p className="text-[9px] uppercase tracking-widest text-gray-600 px-1">Destek Talebi</p>
                        {showGeneral && (
                            <button onClick={() => handleCreateSupport('general')} disabled={creatingSupport === 'general'}
                                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-blue-600/15 text-gray-400 hover:text-blue-300 text-xs transition-all disabled:opacity-40">
                                🎧 <span>{creatingSupport === 'general' ? 'Oluşturuluyor…' : 'Destek Al'}</span>
                            </button>
                        )}
                        {showEscalate && (
                            <button onClick={() => handleCreateSupport('expert')} disabled={creatingSupport === 'expert'}
                                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-purple-600/15 text-gray-400 hover:text-purple-300 text-xs transition-all disabled:opacity-40">
                                🏛️ <span>{creatingSupport === 'expert' ? 'Oluşturuluyor…' : 'Yöneticiye Ulaş'}</span>
                            </button>
                        )}
                        {showAdmin && (
                            <button onClick={() => handleCreateSupport('moderator')} disabled={creatingSupport === 'moderator'}
                                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-orange-600/15 text-gray-400 hover:text-orange-300 text-xs transition-all disabled:opacity-40">
                                ⚙️ <span>{creatingSupport === 'moderator' ? 'Oluşturuluyor…' : 'Admine Ulaş'}</span>
                            </button>
                        )}
                        {showGlobalAdmin && (
                            <button onClick={() => handleCreateSupport('admin')} disabled={creatingSupport === 'admin'}
                                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-600/15 text-gray-400 hover:text-red-300 text-xs transition-all disabled:opacity-40">
                                🌐 <span>{creatingSupport === 'admin' ? 'Oluşturuluyor…' : 'Global Admini Ara'}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Konuşma / Havuz listesi */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {tab === 'mine' && (
                        filteredConvs.length === 0
                            ? <p className="text-center text-gray-600 text-xs pt-6">
                                {conversations.length > 0 ? 'Filtreyle eşleşen konuşma yok' : 'Henüz konuşma yok'}
                              </p>
                            : filteredConvs.map(conv => (
                                <ConvItem key={conv.id} conv={conv}
                                    isActive={conv.id === activeConversationId}
                                    onClick={() => { setActiveConversation(conv.id); setShowSettings(false); }} />
                            ))
                    )}
                    {tab === 'pool' && (
                        supportPool.length === 0
                            ? <p className="text-center text-gray-600 text-xs pt-6">Havuzda bekleyen talep yok</p>
                            : (
                                <div className="space-y-2 p-1">
                                    {supportPool.map(conv => (
                                        <PoolItem key={conv.id} conv={conv}
                                            isClaiming={claimingId === conv.id}
                                            onClaim={() => handleClaim(conv.id)} />
                                    ))}
                                </div>
                            )
                    )}
                </div>
            </div>

            {/* ── Orta: mesaj alanı ──────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f1a]">
                {activeConversationId == null ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
                        <span className="text-5xl opacity-40">💬</span>
                        <p className="text-sm font-medium text-gray-500">Bir konuşma seçin</p>
                        {anySupport && <p className="text-xs text-gray-600">ya da sol panelden destek talebi oluşturun</p>}
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/8 flex items-center gap-3 bg-[#13131f] flex-shrink-0">
                            <button onClick={() => setActiveConversation(null)}
                                className="text-gray-500 hover:text-white transition-colors text-lg leading-none flex-shrink-0">←</button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-sm text-white truncate">
                                        {activeConv?.title ?? `Konuşma #${activeConversationId}`}
                                    </p>
                                    {activeConv?.status && activeConv.status !== 'active' && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${STATUS_COLOR[activeConv.status]}`}>
                                            {STATUS_LABEL[activeConv.status]}
                                        </span>
                                    )}
                                    {activeConv?.type === 'support' && activeConv.supportCategory && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${CAT_COLOR[activeConv.supportCategory] ?? ''}`}>
                                            {CAT_LABEL[activeConv.supportCategory]}
                                        </span>
                                    )}
                                </div>
                                {activeConv?.type === 'support' && activeConv.assignedToUsername && (
                                    <p className="text-[10px] text-gray-500 mt-0.5">Yetkili: <span className="text-gray-300">{activeConv.assignedToUsername}</span></p>
                                )}
                            </div>
                            <button
                                onClick={showSettings ? () => setShowSettings(false) : openSettings}
                                disabled={loadingDetail}
                                className="text-gray-500 hover:text-white p-1.5 rounded-xl hover:bg-white/8 transition-all flex-shrink-0"
                                title="Konuşma Ayarları"
                            >
                                ⚙️
                            </button>
                        </div>

                        {/* Kapalı banner */}
                        {isClosed && (
                            <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/20 text-center flex-shrink-0">
                                <p className="text-xs text-amber-400/80">🔒 Bu konuşma kapatılmış — yeni mesaj gönderilemiyor.</p>
                            </div>
                        )}

                        {/* Mesajlar */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {hasMore && (
                                <div className="text-center mb-3">
                                    <button onClick={handleLoadMore} disabled={loadingMore}
                                        className="text-xs text-[#9999cc] hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all">
                                        {loadingMore ? '⏳ Yükleniyor…' : '▲ Önceki mesajlar'}
                                    </button>
                                </div>
                            )}
                            {currentMsgs.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-32 gap-2">
                                    <p className="text-gray-600 text-xs">
                                        {activeConv?.status === 'pending' ? '⏳ Yetkilinin bağlanması bekleniyor…' : 'Henüz mesaj yok'}
                                    </p>
                                </div>
                            )}
                            {currentMsgs.map(msg => (
                                <MessageBubble key={msg.id} msg={msg}
                                    isMine={msg.senderUserId === myUserId}
                                    canDeleteMsg={canDeleteMsg}
                                    onDelete={() => handleDeleteMsg(msg.id)} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Girdi */}
                        {!isClosed && (
                            <div className="p-3 border-t border-white/8 flex gap-2 flex-shrink-0 bg-[#13131f]">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder="Mesaj yaz… (Enter ile gönder)"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#6c63ff] focus:bg-white/8 transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !input.trim()}
                                    className="bg-[#6c63ff] hover:bg-[#7b72ff] disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all flex-shrink-0 shadow-lg shadow-[#6c63ff]/20"
                                >
                                    ↑
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Sağ: ayarlar ─────────────────────────────────────────────── */}
            {showSettings && convDetail && (
                <SettingsPanel
                    conv={convDetail}
                    myUserId={myUserId}
                    canManage={canManage}
                    onClose={() => setShowSettings(false)}
                    onConvClose={handleCloseConversation}
                    onConvDelete={handleDeleteConversation}
                    onLeave={handleLeave}
                    onRefresh={refreshDetail}
                />
            )}
        </div>
    );
};

export default ChatPanel;
