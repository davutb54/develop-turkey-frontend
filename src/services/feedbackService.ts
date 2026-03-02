import api from './api';

export const feedbackService = {
    add: (data: { userId: number, title: string, message: string }) => {
        return api.post('/feedback/add', data);
    },
    getAll: () => {
        return api.get('/feedback/getall');
    },
    markAsRead: (id: number) => {
        return api.post(`/feedback/markasread?id=${id}`);
    }
};