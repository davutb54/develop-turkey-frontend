import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { useFeature } from '../hooks/useFeature';
import { chatService } from '../services/chatService';
import type { ConversationDetail, ConversationSummary, MessageDto } from '../types';

// ---------------------------------------------------------------------------
// Tip Tanımları
// ---------------------------------------------------------------------------
interface ChatContextType {
  conversations: ConversationSummary[];
  supportPool: ConversationSummary[];
  messages: Record<number, MessageDto[]>;
  activeConversationId: number | null;
  setActiveConversation: (id: number | null) => void;
  sendMessage: (conversationId: number, body: string) => Promise<void>;
  joinConversation: (conversationId: number) => Promise<void>;
  leaveConversation: (conversationId: number) => Promise<void>;
  markRead: (conversationId: number, lastReadMessageId: number) => void;
  loadHistory: (conversationId: number, beforeMessageId?: number) => Promise<boolean>;
  refreshConversations: () => Promise<void>;
  refreshPool: () => Promise<void>;
  createSupport: (category: 'general' | 'expert' | 'moderator' | 'admin', initialMessage?: string) => Promise<ConversationDetail | null>;
  claimConversation: (conversationId: number) => Promise<boolean>;
  closeConversation: (conversationId: number) => Promise<boolean>;
  deleteConversation: (conversationId: number) => Promise<boolean>;
  isConnected: boolean;
  totalUnread: number;
  /** Yönetici seviyesinde (chat.institution_manage / global_manage / handle_*) mi? */
  isStaff: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ChatContext = createContext<ChatContextType>({
  conversations: [],
  supportPool: [],
  messages: {},
  activeConversationId: null,
  setActiveConversation: () => {},
  sendMessage: async () => {},
  joinConversation: async () => {},
  leaveConversation: async () => {},
  markRead: () => {},
  loadHistory: async () => false,
  refreshConversations: async () => {},
  refreshPool: async () => {},
  createSupport: async (_cat) => null,
  claimConversation: async () => false,
  closeConversation: async () => false,
  deleteConversation: async () => false,
  isConnected: false,
  totalUnread: 0,
  isStaff: false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, hasCapability } = useAuth();
  const chatEnabled    = useFeature<boolean>('Communication.EnableChat',        false);
  const supportEnabled = useFeature<boolean>('Communication.EnableSupportChat', false);

  // Either feature enabled allows chat hub connection
  const anyEnabled = chatEnabled || supportEnabled;

  const canChat  = hasCapability('chat.use') || hasCapability('chat.support_request');
  const isStaff  = hasCapability('chat.institution_manage')
                || hasCapability('chat.global_manage')
                || hasCapability('chat.handle_support')
                || hasCapability('chat.handle_escalations');

  const connectionRef = useRef<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [supportPool, setSupportPool]     = useState<ConversationSummary[]>([]);
  const [messages, setMessages]           = useState<Record<number, MessageDto[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  // Total unread badge
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  // ── REST yardımcıları ────────────────────────────────────────────────────

  const refreshConversations = useCallback(async () => {
    if (!userId || !anyEnabled || !canChat) return;
    try {
      const res = await chatService.getMyConversations();
      if (res.data.success) setConversations(res.data.data ?? []);
    } catch { /* sessiz hata */ }
  }, [userId, anyEnabled, canChat]);

  const refreshPool = useCallback(async () => {
    if (!userId || !anyEnabled || !isStaff) return;
    try {
      const res = await chatService.getPool();
      if (res.data.success) setSupportPool(res.data.data ?? []);
    } catch { /* sessiz hata */ }
  }, [userId, anyEnabled, isStaff]);

  const loadHistory = useCallback(async (conversationId: number, beforeMessageId?: number): Promise<boolean> => {
    try {
      const res = await chatService.getHistory(conversationId, 50, beforeMessageId);
      if (!res.data.success) return false;
      const items = res.data.data.items;
      setMessages(prev => {
        const existing = prev[conversationId] ?? [];
        const ids = new Set(existing.map(m => m.id));
        const newItems = items.filter(m => !ids.has(m.id));
        const merged = beforeMessageId ? [...newItems, ...existing] : [...existing, ...newItems];
        return { ...prev, [conversationId]: merged };
      });
      return res.data.data.hasMore;
    } catch {
      return false;
    }
  }, []);

  const markRead = useCallback((conversationId: number, lastReadMessageId: number) => {
    chatService.markRead(conversationId, lastReadMessageId).catch(() => {});
    if (connectionRef.current?.state === 'Connected')
      connectionRef.current.invoke('MarkRead', conversationId, lastReadMessageId).catch(() => {});
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
    );
  }, []);

  const sendMessage = useCallback(async (conversationId: number, body: string) => {
    if (connectionRef.current?.state === 'Connected') {
      await connectionRef.current.invoke('SendMessage', conversationId, body);
    } else {
      const res = await chatService.sendMessage(conversationId, body);
      if (res.data.success)
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] ?? []), res.data.data],
        }));
    }
  }, []);

  const joinConversation = useCallback(async (conversationId: number) => {
    if (connectionRef.current?.state === 'Connected')
      await connectionRef.current.invoke('JoinConversation', conversationId).catch(() => {});
    await loadHistory(conversationId);
  }, [loadHistory]);

  const leaveConversation = useCallback(async (conversationId: number) => {
    if (connectionRef.current?.state === 'Connected')
      await connectionRef.current.invoke('LeaveConversation', conversationId).catch(() => {});
  }, []);

  const setActiveConversation = useCallback((id: number | null) => {
    setActiveConversationId(prev => {
      if (prev !== null && connectionRef.current?.state === 'Connected')
        connectionRef.current.invoke('LeaveConversation', prev).catch(() => {});
      return id;
    });
    if (id !== null) {
      if (connectionRef.current?.state === 'Connected')
        connectionRef.current.invoke('JoinConversation', id).catch(() => {});
      loadHistory(id);
    }
  }, [loadHistory]);

  // ── Destek eylemleri ─────────────────────────────────────────────────────

  const createSupport = useCallback(async (
    category: 'general' | 'expert' | 'moderator' | 'admin',
    initialMessage?: string
  ): Promise<ConversationDetail | null> => {
    try {
      const res = await chatService.startSupport(category, initialMessage);
      if (!res.data.success) return null;
      const conv = res.data.data;
      setConversations(prev => [conv, ...prev]);
      return conv;
    } catch {
      return null;
    }
  }, []);

  const claimConversation = useCallback(async (conversationId: number): Promise<boolean> => {
    try {
      const res = await chatService.claim(conversationId);
      if (!res.data.success) return false;
      setSupportPool(prev => prev.filter(c => c.id !== conversationId));
      await refreshConversations();
      return true;
    } catch {
      return false;
    }
  }, [refreshConversations]);

  const closeConversation = useCallback(async (conversationId: number): Promise<boolean> => {
    try {
      const res = await chatService.closeConversation(conversationId);
      if (!res.data.success) return false;
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, status: 'closed' } : c)
      );
      setSupportPool(prev => prev.filter(c => c.id !== conversationId));
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: number): Promise<boolean> => {
    try {
      const res = await chatService.deleteConversation(conversationId);
      if (!res.data.success) return false;
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setSupportPool(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversationId === conversationId) setActiveConversationId(null);
      return true;
    } catch {
      return false;
    }
  }, [activeConversationId]);

  // ── SignalR bağlantısı ────────────────────────────────────────────────────

  // isStaff'ı ref'e al — SignalR event closure'larında güncel değere ulaşmak için
  const isStaffRef = useRef(isStaff);
  useEffect(() => { isStaffRef.current = isStaff; }, [isStaff]);

  useEffect(() => {
    if (!userId || !anyEnabled || !canChat) {
      connectionRef.current?.stop();
      connectionRef.current = null;
      setIsConnected(false);
      return;
    }
    if (connectionRef.current) return;

    const connection = new HubConnectionBuilder()
      .withUrl('/api/hubs/chat', {
        withCredentials: true,
        headers: { 'X-Site-Token': import.meta.env.VITE_SITE_TOKEN || '' },
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    // Yeni mesaj geldi
    connection.on('ReceiveMessage', (msg: MessageDto) => {
      setMessages(prev => ({
        ...prev,
        [msg.conversationId]: [...(prev[msg.conversationId] ?? []), msg],
      }));
      setConversations(prev =>
        prev.map(c =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg, unreadCount: c.unreadCount + 1 }
            : c
        )
      );
    });

    // Okundu
    connection.on('ReadAck', ({ conversationId }: { conversationId: number }) => {
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
      );
    });

    // Gruba eklenince / yeni konuşma oluşturulunca
    connection.on('ConversationAdded', (conv: ConversationSummary) => {
      setConversations(prev =>
        prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]
      );
    });

    // Konuşmadan çıkarıldı veya silindi
    connection.on('ConversationRemoved', ({ conversationId }: { conversationId: number }) => {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      setSupportPool(prev => prev.filter(c => c.id !== conversationId));
      setActiveConversationId(prev => prev === conversationId ? null : prev);
    });

    // Konuşma güncellendi
    connection.on('ConversationUpdated', (updated: Partial<ConversationSummary> & { id?: number; conversationId?: number }) => {
      const id = updated.id ?? updated.conversationId;
      if (!id) return;
      setConversations(prev =>
        prev.map(c => c.id === id ? { ...c, ...updated } : c)
      );
    });

    // Konuşma kapatıldı
    connection.on('ConversationClosed', ({ conversationId }: { conversationId: number }) => {
      setConversations(prev => {
        const conv = prev.find(c => c.id === conversationId);
        if (!conv) return prev;

        // Normal kullanıcılar (non-staff) kapatılan destek konuşmalarını listeden kaldır
        if (!isStaffRef.current && conv.type === 'support') {
          setActiveConversationId(active => active === conversationId ? null : active);
          return prev.filter(c => c.id !== conversationId);
        }

        // Yöneticiler için kapat (tarihsel kayıt)
        return prev.map(c => c.id === conversationId ? { ...c, status: 'closed' } : c);
      });
      setSupportPool(prev => prev.filter(c => c.id !== conversationId));
    });

    // Yeni destek talebi havuza düştü
    connection.on('SupportNew', (conv: ConversationSummary) => {
      setSupportPool(prev =>
        prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]
      );
    });

    // Destek talebi sahiplenildi
    connection.on('SupportClaimed', ({ conversationId }: { conversationId: number }) => {
      setSupportPool(prev => prev.filter(c => c.id !== conversationId));
    });

    // Destek talebi kapatıldı / silindi
    connection.on('SupportClosed', ({ conversationId }: { conversationId: number }) => {
      setSupportPool(prev => prev.filter(c => c.id !== conversationId));
    });

    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => setIsConnected(false));

    connection.start()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    connectionRef.current = connection;

    return () => {
      connection.stop();
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, [userId, anyEnabled, canChat]);

  // İlk yükleme
  useEffect(() => { refreshConversations(); }, [refreshConversations]);
  useEffect(() => { if (isStaff) refreshPool(); }, [refreshPool, isStaff]);

  return (
    <ChatContext.Provider value={{
      conversations,
      supportPool,
      messages,
      activeConversationId,
      setActiveConversation,
      sendMessage,
      joinConversation,
      leaveConversation,
      markRead,
      loadHistory,
      refreshConversations,
      refreshPool,
      createSupport,
      claimConversation,
      closeConversation,
      deleteConversation,
      isConnected,
      totalUnread,
      isStaff,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useChat = () => useContext(ChatContext);
