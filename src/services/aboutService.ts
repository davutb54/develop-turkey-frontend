import api from './api';

export const aboutService = {
    getActive: () => api.get('/about/active'),
    // Admin metotları
    getAll: () => api.get('/admin/aboutsections'),
    add: (data: any) => api.post('/admin/aboutsections', data),
    update: (data: any) => api.put('/admin/aboutsections', data),
    delete: (id: number) => api.delete(`/admin/aboutsections/${id}`),
};
