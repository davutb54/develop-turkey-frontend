import api from './api';

export const institutionService = {
    /** Kurum listesi — admin.institution_read capability gerektirir. */
    getAll: () => api.get("/Institution/getall"),
    /** Yalnız branding bilgilerini döner (anonim erişim). */
    getByDomain: (domain: string) => api.get(`/Institution/getbydomain?domain=${domain}`),
    /** Subdomain slug ile kurum tespiti — anonim, yalnız branding döner. */
    getBySubdomain: (slug: string) => api.get(`/Institution/getbysubdomain?slug=${slug}`),
    getById: (id: number) => api.get(`/Institution/getbyid?id=${id}`),

    // Admin yetkisi gerektirenler
    add: (formData: FormData) => api.post("/Institution/add", formData),
    update: (formData: FormData) => api.put("/Institution/update", formData),
    delete: (id: number) => api.delete(`/Institution/delete?id=${id}`),

    /** Kullanıcının kurumunu değiştirir — admin.user_institution_change gerektirir. */
    changeUserInstitution: (userId: number, newInstitutionId: number) =>
        api.post(`/user/change-institution?userId=${userId}&newInstitutionId=${newInstitutionId}`),
};