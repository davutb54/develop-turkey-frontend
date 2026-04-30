import api from './api';
import type { IDataResult, IResult, AdminDashboardDto, DashboardAnalyticsDto, SystemHealthDto, Log, LogFilterDto, ProblemDetailDto, ImpersonateDto, SystemSettings } from '../types';

export const adminService = {
    getDashboardStats: async () => {
        return api.get<IDataResult<AdminDashboardDto>>('/admin/dashboard');
    },
    getDashboardAnalytics: async () => {
        return api.get<IDataResult<DashboardAnalyticsDto>>('/admin/analytics');
    },
    getSystemHealthStatus: async () => {
        return api.get<IDataResult<SystemHealthDto>>('/admin/health');
    },
    impersonateUser: async (data: ImpersonateDto) => {
        return api.post<IResult>('/admin/impersonate', data);
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
        return api.get<IDataResult<Log[]>>('/admin/getlogs', { params: filter });
    },
    // YETKİLENDİRME METODLARI
    toggleAdminRole: async (userId: number) => {
        return api.post<IResult>(`/admin/toggleadminrole?userId=${userId}`);
    },
    toggleExpertRole: async (userId: number) => {
        return api.post<IResult>(`/admin/toggleexpertrole?userId=${userId}`);
    },
    toggleOfficialRole: async (userId: number) => {
        return api.post<IResult>(`/admin/toggleofficialrole?userId=${userId}`);
    },
    toggleProblemHighlight: async (problemId: number) => {
        return api.post<IResult>(`/admin/toggleproblemhighlight?problemId=${problemId}`);
    },
    toggleSolutionHighlight: async (solutionId: number) => {
        return api.post<IResult>(`/admin/togglesolutionhighlight?solutionId=${solutionId}`);
    },
    // SORUNU ÇÖZÜLDÜ OLARAK İŞARETLEME
    toggleProblemResolved: async (id: number) => {
        return api.post<IResult>(`/admin/toggleproblemresolved?problemId=${id}`, {});
    },
    // BEKLEYEN UZMAN ÇÖZÜMLERİNİ GETİR
    getPendingExpertSolutions: async () => {
        return api.get<IDataResult<any[]>>('/admin/getpendingexpertsolutions');
    },

    // ÇÖZÜMÜ ONAYLA
    approveSolution: async (id: number) => {
        return api.post<IResult>(`/admin/approvesolution?solutionId=${id}`, {});
    },

    // ÇÖZÜMÜ REDDET
    rejectSolution: async (id: number) => {
        return api.post<IResult>(`/admin/rejectsolution?solutionId=${id}`, {});
    },

    getAllProblems: async () => {
        return api.get('/admin/getallproblems');
    },
    getAllSolutions: async () => {
        return api.get('/admin/getallsolutions');
    },

    removeTopicFromProblem: async (problemId: number, topicId: number) => {
        // Backend'in Query veya FormData beklemesine göre ayarla. Burada Query String kullanıldı.
        return api.post(`/admin/removetopicfromproblem?problemId=${problemId}&topicId=${topicId}`);
    },
    getAllTopics: async () => {
        return api.get('/admin/getalltopics');
    },
    // SİSTEM AYARLARI
    getSystemSettings: async () => {
        return api.get<IDataResult<SystemSettings>>('/admin/systemsettings/get');
    },
    updateSystemSettings: async (settings: SystemSettings) => {
        return api.post<IResult>('/admin/systemsettings/update', settings);
    },
    // PUBLIC FOOTER BİLGİLERİ (token gerekmez)
    getPublicSiteInfo: async () => {
        return api.get('/admin/systemsettings/public');
    },
    // KULLANICI UYARI YÖNETİMİ
    issueWarning: async (data: { userId: number; title: string; message: string; severity: string }) => {
        return api.post<IResult>('/admin/issue-warning', data);
    },
    revokeWarning: async (warningId: number) => {
        return api.post<IResult>(`/admin/revoke-warning?warningId=${warningId}`);
    },
    getUserWarnings: async (userId: number) => {
        return api.get<IDataResult<any[]>>(`/admin/user-warnings?userId=${userId}`);
    },
};