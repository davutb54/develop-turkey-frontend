import api from './api';
import type { ConversationDetail, ConversationSummary, MessagePage, MessageDto } from '../types';

export const chatService = {
    getMyConversations: () =>
        api.get<{ success: boolean; data: ConversationSummary[] }>('/conversation'),

    getDetail: (id: number) =>
        api.get<{ success: boolean; data: ConversationDetail }>(`/conversation/${id}`),

    getPool: () =>
        api.get<{ success: boolean; data: ConversationSummary[] }>('/conversation/pool'),

    startDirect: (targetUserId: number) =>
        api.post<{ success: boolean; data: ConversationDetail }>('/conversation/direct', { targetUserId }),

    startGroup: (title: string, participantUserIds: number[]) =>
        api.post<{ success: boolean; data: ConversationDetail }>('/conversation/group', { title, participantUserIds }),

    startSupport: (category: 'general' | 'expert' | 'moderator' | 'admin', initialMessage?: string) =>
        api.post<{ success: boolean; data: ConversationDetail }>('/conversation/support', { category, initialMessage }),

    addParticipant: (conversationId: number, userId: number) =>
        api.post<{ success: boolean; message: string }>(`/conversation/${conversationId}/participants`, { userId }),

    removeParticipant: (conversationId: number, userId: number) =>
        api.delete<{ success: boolean; message: string }>(`/conversation/${conversationId}/participants/${userId}`),

    claim: (conversationId: number) =>
        api.post<{ success: boolean; message: string }>(`/conversation/${conversationId}/claim`),

    closeConversation: (conversationId: number) =>
        api.post<{ success: boolean; message: string }>(`/conversation/${conversationId}/close`),

    updateTitle: (conversationId: number, title: string) =>
        api.patch<{ success: boolean; message: string }>(`/conversation/${conversationId}/title`, { title }),

    getHistory: (conversationId: number, pageSize = 50, beforeMessageId?: number) =>
        api.get<{ success: boolean; data: MessagePage }>(
            `/message/conversation/${conversationId}`,
            { params: { pageSize, beforeMessageId } }
        ),

    sendMessage: (conversationId: number, body: string) =>
        api.post<{ success: boolean; data: MessageDto }>(`/message/conversation/${conversationId}`, { body }),

    markRead: (conversationId: number, lastReadMessageId: number) =>
        api.post<{ success: boolean }>(`/message/conversation/${conversationId}/read`, { lastReadMessageId }),

    deleteMessage: (messageId: number) =>
        api.delete<{ success: boolean }>(`/message/${messageId}`),

    deleteConversation: (conversationId: number) =>
        api.delete<{ success: boolean; message: string }>(`/conversation/${conversationId}`),
};
