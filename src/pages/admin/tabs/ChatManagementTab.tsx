import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useChat } from '../../../context/ChatContext';
import { chatService } from '../../../services/chatService';
import { userService } from '../../../services/userService';
import ChatPanel from '../../../components/chat/ChatPanel';
import { useFeature } from '../../../hooks/useFeature';
import type { UserDetailDto } from '../../../types';

const ChatManagementTab: React.FC = () => {
    const { hasCapability } = useAuth();
    const chatEnabled    = useFeature<boolean>('Communication.EnableChat',        false);
    const supportEnabled = useFeature<boolean>('Communication.EnableSupportChat', false);
    const anyEnabled     = chatEnabled || supportEnabled;

    const { refreshConversations, refreshPool } = useChat();
    const canManage = hasCapability('chat.institution_manage') || hasCapability('chat.global_manage');

    // Yeni grup formu
    const [showNewGroup, setShowNewGroup]   = useState(false);
    const [groupTitle, setGroupTitle]       = useState('');
    const [creating, setCreating]           = useState(false);
    const [error, setError]                 = useState<string | null>(null);

    // Katılımcı arama
    const [participantSearch, setParticipantSearch]       = useState('');
    const [searchResults, setSearchResults]               = useState<UserDetailDto[]>([]);
    const [searchLoading, setSearchLoading]               = useState(false);
    const [showDropdown, setShowDropdown]                 = useState(false);
    const [selectedParticipants, setSelectedParticipants] = useState<UserDetailDto[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    // Debounced user search
    useEffect(() => {
        if (participantSearch.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await userService.getAllPaged({ searchText: participantSearch, pageSize: 8 });
                if (res.data.success) {
                    const items: UserDetailDto[] = res.data.data.items ?? res.data.data ?? [];
                    setSearchResults(items.filter(u => !selectedParticipants.find(s => s.id === u.id)));
                    setShowDropdown(true);
                }
            } catch { setSearchResults([]); } finally { setSearchLoading(false); }
        }, 350);
        return () => clearTimeout(timer);
    }, [participantSearch, selectedParticipants]);

    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node))
                setShowDropdown(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const addParticipant = (user: UserDetailDto) => {
        setSelectedParticipants(prev => [...prev, user]);
        setParticipantSearch(''); setShowDropdown(false); setSearchResults([]);
    };
    const removeParticipant = (id: number) =>
        setSelectedParticipants(prev => prev.filter(u => u.id !== id));

    const handleCreateGroup = async () => {
        if (!groupTitle.trim()) { setError('Grup adı boş olamaz.'); return; }
        if (selectedParticipants.length === 0) { setError('En az bir katılımcı ekleyin.'); return; }
        setCreating(true); setError(null);
        try {
            const res = await chatService.startGroup(groupTitle.trim(), selectedParticipants.map(u => u.id));
            if (res.data.success) {
                setGroupTitle(''); setSelectedParticipants([]); setParticipantSearch(''); setShowNewGroup(false);
                await refreshConversations();
            } else { setError('Grup oluşturulamadı.'); }
        } catch { setError('Beklenmeyen hata.'); } finally { setCreating(false); }
    };

    if (!anyEnabled) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                    <div className="text-5xl opacity-30">💬</div>
                    <p className="text-lg font-bold text-white">Sohbet Sistemi Devre Dışı</p>
                    <p className="text-sm text-gray-400">
                        <span className="font-mono text-[#9999cc]">Communication.EnableChat</span> veya{' '}
                        <span className="font-mono text-[#9999cc]">Communication.EnableSupportChat</span>
                        {' '}feature'ını Modül Yönetimi'nden aktif edin.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">
            {/* Araç çubuğu */}
            <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-white">Sohbet Yönetimi</h2>
                        {chatEnabled && (
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-semibold">
                                Genel Aktif
                            </span>
                        )}
                        {supportEnabled && (
                            <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full font-semibold">
                                Destek Aktif
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Destek talepleri <strong className="text-gray-300">Havuz</strong> sekmesinde görünür.
                        Silme, kapatma ve katılımcı yönetimi ⚙️ ikonundan yapılır.
                    </p>
                </div>
                {canManage && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => refreshPool()}
                            className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs px-3 py-2 rounded-xl transition-all border border-white/8"
                            title="Havuzu yenile"
                        >
                            ↻ Havuz
                        </button>
                        <button
                            onClick={() => { setShowNewGroup(!showNewGroup); setError(null); }}
                            className="bg-[#6c63ff] hover:bg-[#7b72ff] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-[#6c63ff]/20"
                        >
                            + Yeni Grup
                        </button>
                    </div>
                )}
            </div>

            {/* Yeni grup formu */}
            {showNewGroup && canManage && (
                <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 flex-shrink-0 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-white">👥 Grup Konuşması Oluştur</p>
                        <button onClick={() => { setShowNewGroup(false); setError(null); setSelectedParticipants([]); setParticipantSearch(''); }}
                            className="text-gray-500 hover:text-white text-lg leading-none transition-colors">×</button>
                    </div>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
                            <p className="text-red-400 text-xs">{error}</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="Grup adı"
                            value={groupTitle}
                            onChange={e => setGroupTitle(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6c63ff] transition-colors"
                        />

                        {selectedParticipants.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedParticipants.map(u => (
                                    <span key={u.id} className="flex items-center gap-1.5 bg-[#6c63ff]/15 border border-[#6c63ff]/30 text-[#a09af7] text-xs px-2.5 py-1 rounded-full">
                                        {u.userName}
                                        <button onClick={() => removeParticipant(u.id)}
                                            className="hover:text-white transition-colors text-sm leading-none">×</button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div ref={searchRef} className="relative">
                            <input
                                type="text"
                                placeholder="Kullanıcı adı veya e-posta ile ara…"
                                value={participantSearch}
                                onChange={e => setParticipantSearch(e.target.value)}
                                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#6c63ff] transition-colors"
                            />
                            {searchLoading && (
                                <span className="absolute right-3 top-2.5 text-gray-400 text-xs animate-pulse">…</span>
                            )}
                            {showDropdown && searchResults.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                    {searchResults.map(u => (
                                        <button key={u.id} onMouseDown={() => addParticipant(u)}
                                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                                            <div className="w-7 h-7 rounded-full bg-[#6c63ff]/25 flex items-center justify-center text-xs text-[#b0aaff] font-bold flex-shrink-0">
                                                {u.userName?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-white font-medium">{u.userName}</p>
                                                {u.email && <p className="text-xs text-gray-400 truncate">{u.email}</p>}
                                            </div>
                                            <span className="text-gray-500 text-xs ml-auto">+ Ekle</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {showDropdown && !searchLoading && participantSearch.length >= 2 && searchResults.length === 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-[#1e1e2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-400">
                                    Kullanıcı bulunamadı.
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button onClick={handleCreateGroup} disabled={creating}
                                className="bg-[#6c63ff] hover:bg-[#7b72ff] disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#6c63ff]/20">
                                {creating ? '⏳ Oluşturuluyor…' : '✓ Oluştur'}
                            </button>
                            <button onClick={() => { setShowNewGroup(false); setError(null); setSelectedParticipants([]); setParticipantSearch(''); }}
                                className="bg-white/5 hover:bg-white/10 text-gray-300 text-sm px-5 py-2.5 rounded-xl transition-all">
                                İptal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat paneli */}
            <div className="flex-1 min-h-0">
                <ChatPanel />
            </div>
        </div>
    );
};

export default ChatManagementTab;
