import api from './api';
import type { IDataResult, IResult, AdminDashboardDto, LogDto, LogFilterDto, ProblemDetailDto } from '../types';

export const adminService = {
    getDashboardStats: async () => {
        return api.get<IDataResult<AdminDashboardDto>>('/admin/dashboard');
    },
    getReportedProblems: async () => {
        return api.get<IDataResult<ProblemDetailDto[]>>('/admin/getreportedproblems');
    },
    deleteProblem: async (id: number) => {
        // Backend parametreyi query string olarak bekliyor
        return api.post<IResult>(`/admin/deleteproblem?id=${id}`);
    },
    banUser: async (userId: number) => {
        return api.post<IResult>(`/admin/banuser?userId=${userId}`);
    },
    unbanUser: async (userId: number) => {
        return api.post<IResult>(`/admin/unbanuser?userId=${userId}`);
    },
    getLogs: async (filter: LogFilterDto) => {
        return api.get<IDataResult<LogDto[]>>('/admin/getlogs', { params: filter });
    }
};