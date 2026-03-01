import api from './api';

export const institutionService = {
    getAll: () => api.get("/Institution/getall"),
    getByDomain: (domain: string) => api.get(`/Institution/getbydomain?domain=${domain}`),
    getById: (id: number) => api.get(`/Institution/getbyid?id=${id}`),
    
    // Admin yetkisi gerektirenler
    add: (formData: FormData) => api.post("/Institution/add", formData),
    update: (formData: FormData) => api.put("/Institution/update", formData),
    delete: (id: number) => api.delete(`/Institution/delete?id=${id}`)
};