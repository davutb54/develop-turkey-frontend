import api from './api';
import type { IDataResult, IResult, ReportDto } from '../types';

export interface ReportAddDto {
    reporterUserId: number;
    targetType: string; // 'Problem', 'Solution' veya 'User'
    targetId: number;
    reason: string;
}

export const reportService = {
    add: async (data: ReportAddDto) => {
        return api.post<IResult>('/report/add', data);
    },
    // Admin yetkisi gerektirenler:
    getPending: async () => {
        return api.get<IDataResult<ReportDto[]>>('/report/getpending');
    },
    resolve: async (id: number) => {
        return api.post<IResult>(`/report/resolve?id=${id}`);
    }
};