import api from './api';

export const feedbackService = {
    add: (data: { userId: number, title: string, message: string }) => {
        return api.post('/feedback/add', data);
    },
    getAll: () => {
        return api.get('/feedback/getall');
    },
    getAllPaged: (params: {
        page?: number;
        pageSize?: number;
        searchText?: string;
        isRead?: boolean;
    }) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.pageSize) query.append('pageSize', params.pageSize.toString());
        if (params.searchText) query.append('searchText', params.searchText);
        if (params.isRead !== undefined) query.append('isRead', params.isRead.toString());
        return api.get(`/feedback/getallpaged?${query.toString()}`);
    },
    markAsRead: (id: number) => {
        return api.post(`/feedback/markasread?id=${id}`);
    }
};