import api from './api';

export interface SecurityEventDto {
    id: number;
    userId?: number | null;
    ipAddress: string;
    eventType: string;
    severity: string;
    path?: string | null;
    detail?: string | null;
    createdAt: string;
    institutionId?: number | null;
}

export interface SecurityEventFilter {
    ipAddress?: string;
    userId?: number;
    eventType?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}

export const securityService = {
    getEvents: async (filter: SecurityEventFilter = {}) => {
        const params = new URLSearchParams();
        Object.entries(filter).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
        });
        return api.get<{ success: boolean; data: SecurityEventDto[]; totalCount: number }>(
            `/security/events?${params.toString()}`
        );
    },
};
