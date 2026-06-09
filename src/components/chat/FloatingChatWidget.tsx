import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFeature } from '../../hooks/useFeature';
import { useChat } from '../../context/ChatContext';
import type { ConversationSummary, MessageDto } from '../../types';

// ── Yardımcı: backend UTC timestamp → doğru yerel saat (Z eksik olabilir)
const toDate = (s: string) =>
    new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');

// ─── Kategori sabitleri ──────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
    general:   'text-blue-400',
    official:  'text-blue-400',
    expert:    'text-purple-400',
    moderator: 'text-orange-400',
    admin:     'text-red-400',
};
const CAT_LABEL: Record<string, string> = {
    general:   'Genel Destek',
    official:  'Genel Destek',
    expert:    'Yöneticiye Ulaş',
    moderator: 'Admine Ulaş',
    admin:     'Global Admin Desteği',
};
const STATUS_LABEL: Record<string, string> = { active: 'Aktif', pending: 'Bekliyor', closed: 'Kapalı' };
const STATUS_COLOR: Record<string, string> = {
    active:  'text-green-400',
    pending: 'text-yellow-400',
    closed:  'text-gray-400',
};

// ─── Mesaj baloncuğu ─────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: MessageDto; isMine: boolean }> = ({ msg, isMine }) => (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMine ? 'bg-[#6c63ff] text-white' : 'bg-white/10 text-gray-100'}`}>
            {!isMine && (
                <p className="text-[10px] text-[#9999cc] mb-0.5 font-medium">{msg.senderUsername}</p>
            )}
            <p className={msg.isDeleted ? 'italic text-gray-400 text-xs' : ''}>
                {msg.isDeleted ? 'Mesaj silindi.' : msg.body}
            </p>
            <p className="text-[10px] mt-0.5 opacity-60 text-right">
                {toDate(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
    </div>
);

// ─── Konuşma listesi satırı ───────────────────────────────────────────────────
const ConvRow: React.FC<{
    conv: ConversationSummary;
    isActive: boolean;
    onClick: () => void;
}> = ({ conv, isActive, onClick }) => {
    const icon = conv.type === 'support' ? '🎧' : conv.type === 'group' ? '👥' : '💬';
    const name = conv.title ?? `Konuşma #${conv.id}`;
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 ${isActive ? 'bg-[#6c63ff]/25 text-white' : 'text-gray-300 hover:bg-white/5'}`}
        >
            <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold truncate">{name}</p>
                    <span className={`text-[9px] font-medium ${STATUS_COLOR[conv.status] ?? ''}`}>
                        {STATUS_LABEL[conv.status]}
                    </span>
                </div>
                {conv.type === 'support' && conv.supportCategory && (
                    <p className={`text-[10px] ${CAT_COLOR[conv.supportCategory] ?? 'text-gray-500'}`}>
                        {CAT_LABEL[conv.supportCategory]}
                    </p>
                )}
                {conv.lastMessage && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{conv.lastMessage.body}</p>
                )}
            </div>
            {conv.unreadCount > 0 && (
                <span className="bg-[#6c63ff] text-white text-[9px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0 mt-0.5">
                    {conv.unreadCount}
                </span>
            )}
        </button>
    );
};

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
const FloatingChatWidget: React.FC = () => {
    // ── Tüm hook'lar koşulsuz olarak en başta (Rules of Hooks) ──────────────
    const { userId, hasCapability } = useAuth();
    const chatEnabled    = useFeature<boolean>('Communication.EnableChat',        false);
    const supportEnabled = useFeature<boolean>('Communication.EnableSupportChat', false);
    const {
        conversations, messages,
        activeConversationId, setActiveConversation,
        sendMessage, markRead, loadHistory,
        createSupport,
        isConnected, totalUnread,
    } = useChat();

    const [isOpen, setIsOpen]           = useState(false);
    const [view, setView]               = useState<'list' | 'chat'>('list');
    const [input, setInput]             = useState('');
    const [sending, setSending]         = useState(false);
    const [creating, setCreating]       = useState<string | null>(null);
    const [hasMore, setHasMore]         = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef       = useRef<HTMLInputElement>(null);

    // Derived — yeniden hesaplanır her render'da; hook değil
    const anyEnabled  = chatEnabled || supportEnabled;
    const canChat     = hasCapability('chat.use');
    const canSupport  = hasCapability('chat.support_request');
    const canEscalate = hasCapability('chat.escalate');
    const canAdmin    = hasCapability('chat.contact_admin');
    const canGlobal   = hasCapability('chat.contact_global_admin');
    const isAdmin     = hasCapability('admin.system_access');
    const myUserId    = userId ? Number(userId) : -1;

    const activeConv  = conversations.find(c => c.id === activeConversationId) ?? null;
    const currentMsgs = activeConversationId ? (messages[activeConversationId] ?? []) : [];
    const isClosed    = activeConv?.status === 'closed';

    // Auto-open when a new conversation is set active externally (e.g. via SupportWidget)
    useEffect(() => {
        if (activeConversationId !== null) {
            setIsOpen(true);
            setView('chat');
        }
    }, [activeConversationId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (view === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMsgs.length, view]);

    // Mark as read when viewing
    useEffect(() => {
        if (!activeConversationId || currentMsgs.length === 0 || view !== 'chat') return;
        const last = currentMsgs[currentMsgs.length - 1];
        if (last) markRead(activeConversationId, last.id);
    }, [activeConversationId, currentMsgs.length, view, markRead]);

    const handleSelectConv = useCallback((id: number) => {
        setActiveConversation(id);
        setView('chat');
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [setActiveConversation]);

    const handleBack = useCallback(() => {
        setView('list');
        setActiveConversation(null);
    }, [setActiveConversation]);

    const handleSend = useCallback(async () => {
        if (!activeConversationId || !input.trim() || sending || isClosed) return;
        setSending(true);
        try { await sendMessage(activeConversationId, input.trim()); setInput(''); }
        catch { /* sessiz */ } finally { setSending(false); }
    }, [activeConversationId, input, sending, isClosed, sendMessage]);

    const handleLoadMore = useCallback(async () => {
        if (!activeConversationId || loadingMore || currentMsgs.length === 0) return;
        setLoadingMore(true);
        const more = await loadHistory(activeConversationId, currentMsgs[0]?.id);
        setHasMore(more);
        setLoadingMore(false);
    }, [activeConversationId, loadingMore, currentMsgs, loadHistory]);

    const handleCreateSupport = useCallback(async (cat: 'general' | 'expert' | 'moderator' | 'admin') => {
        setCreating(cat);
        const conv = await createSupport(cat);
        setCreating(null);
        if (conv) {
            setActiveConversation(conv.id);
            setView('chat');
        }
    }, [createSupport, setActiveConversation]);

    // ── Görünürlük kontrolü — hook'lardan SONRA ───────────────────────────────
    // Admin paneli kullananlar için FloatingChatWidget gösterilmez
    // (onlar ChatPanel'i admin layout'ta kullanır)
    if (!userId || !anyEnabled || (!canChat && !canSupport) || isAdmin) {
        return null;
    }

    // Kapalı destek konuşmalarını düzenli kullanıcılardan gizle
    const visibleConvs = conversations.filter(c => c.status !== 'closed');
    const hasSupport   = canSupport || canEscalate || canAdmin || canGlobal;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* ── Açık panel ────────────────────────────────────────────────── */}
            {isOpen && (
                <div className="w-[340px] h-[480px] bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#1a1a2e] flex-shrink-0">
                        <div className="flex items-center gap-2">
                            {view === 'chat' && (
                                <button onClick={handleBack} className="text-gray-400 hover:text-white mr-1 text-lg leading-none" title="Geri">←</button>
                            )}
                            <div>
                                <p className="text-sm font-bold text-white">
                                    {view === 'chat' ? (activeConv?.title ?? `Konuşma #${activeConversationId}`) : '💬 Sohbet'}
                                </p>
                                {view === 'chat' && activeConv?.type === 'support' && activeConv.assignedToUsername && (
                                    <p className="text-[10px] text-gray-400">Yetkili: {activeConv.assignedToUsername}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400' : 'bg-gray-500'}`}
                                  title={isConnected ? 'Bağlı' : 'Bağlantı yok'} />
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none ml-1">×</button>
                        </div>
                    </div>

                    {/* ── List view ───────────────────────────────────────── */}
                    {view === 'list' && (
                        <div className="flex-1 overflow-y-auto flex flex-col">
                            {hasSupport && (
                                <div className="p-3 border-b border-white/10 space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 px-1 mb-2">Destek Talebi Aç</p>
                                    {canSupport && (
                                        <button onClick={() => handleCreateSupport('general')} disabled={creating === 'general'}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-medium transition-all disabled:opacity-40">
                                            <span className="text-base">🎧</span>
                                            <span>{creating === 'general' ? 'Oluşturuluyor…' : 'Destek Al'}</span>
                                        </button>
                                    )}
                                    {canEscalate && (
                                        <button onClick={() => handleCreateSupport('expert')} disabled={creating === 'expert'}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-medium transition-all disabled:opacity-40">
                                            <span className="text-base">🏛️</span>
                                            <span>{creating === 'expert' ? 'Oluşturuluyor…' : 'Yöneticiye Ulaş'}</span>
                                        </button>
                                    )}
                                    {canAdmin && (
                                        <button onClick={() => handleCreateSupport('moderator')} disabled={creating === 'moderator'}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs font-medium transition-all disabled:opacity-40">
                                            <span className="text-base">⚙️</span>
                                            <span>{creating === 'moderator' ? 'Oluşturuluyor…' : 'Admine Ulaş'}</span>
                                        </button>
                                    )}
                                    {canGlobal && (
                                        <button onClick={() => handleCreateSupport('admin')} disabled={creating === 'admin'}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium transition-all disabled:opacity-40">
                                            <span className="text-base">🌐</span>
                                            <span>{creating === 'admin' ? 'Oluşturuluyor…' : 'Global Admini Ara'}</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                {visibleConvs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500 pt-6">
                                        <span className="text-3xl">💬</span>
                                        <p className="text-xs">Henüz aktif sohbet yok</p>
                                    </div>
                                ) : visibleConvs.map(conv => (
                                    <ConvRow key={conv.id} conv={conv}
                                        isActive={conv.id === activeConversationId}
                                        onClick={() => handleSelectConv(conv.id)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Chat view ────────────────────────────────────────── */}
                    {view === 'chat' && activeConversationId !== null && (
                        <div className="flex-1 flex flex-col min-h-0">
                            {isClosed && (
                                <div className="px-4 py-2.5 bg-gray-700/30 border-b border-white/10 text-center flex-shrink-0">
                                    <p className="text-xs text-gray-400">🔒 Destek talebiniz kapatıldı.</p>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-3">
                                {hasMore && (
                                    <div className="text-center mb-2">
                                        <button onClick={handleLoadMore} disabled={loadingMore}
                                            className="text-[11px] text-[#9999cc] hover:text-white">
                                            {loadingMore ? '…' : '▲ Önceki mesajlar'}
                                        </button>
                                    </div>
                                )}
                                {currentMsgs.length === 0 && (
                                    <p className="text-center text-gray-600 text-xs pt-8">
                                        {activeConv?.status === 'pending' ? '⏳ Yetkilinin yanıtı bekleniyor…' : 'Henüz mesaj yok'}
                                    </p>
                                )}
                                {currentMsgs.map(msg => (
                                    <Bubble key={msg.id} msg={msg} isMine={msg.senderUserId === myUserId} />
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {!isClosed && (
                                <div className="p-3 border-t border-white/10 flex gap-2 flex-shrink-0">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        placeholder="Mesajınızı yazın…"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6c63ff]"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={sending || !input.trim()}
                                        className="bg-[#6c63ff] hover:bg-[#7b72ff] disabled:opacity-40 text-white rounded-xl px-3 py-2 text-sm font-medium transition-colors flex-shrink-0"
                                    >
                                        ↑
                                    </button>
                                </div>
                            )}

                            {isClosed && (
                                <div className="p-3 border-t border-white/10 flex-shrink-0">
                                    <button onClick={handleBack}
                                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-xs py-2 rounded-xl transition-colors">
                                        ← Sohbetlere Dön
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tetikleyici buton ──────────────────────────────────────────── */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className="w-14 h-14 bg-[#6c63ff] hover:bg-[#7b72ff] text-white rounded-2xl shadow-2xl shadow-[#6c63ff]/30 flex items-center justify-center text-2xl transition-all hover:scale-105 active:scale-95 relative"
                title="Sohbet"
            >
                {isOpen ? '✕' : '💬'}
                {!isOpen && totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg">
                        {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                )}
            </button>
        </div>
    );
};

export default FloatingChatWidget;
