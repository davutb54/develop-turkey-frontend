import api from './api';

export const featureService = {
    // Feature Grupları
    getFeatureGroups: () => api.get("/FeatureGroups/getall"),
    addFeatureGroup: (group: any) => api.post("/FeatureGroups/add", group),
    updateFeatureGroup: (group: any) => api.post("/FeatureGroups/update", group),
    deleteFeatureGroup: (id: number) => api.post(`/FeatureGroups/delete?id=${id}`),

    // Feature Tanımları
    getFeatureDefinitions: () => api.get("/FeatureDefinitions/getall"),
    getDefinitionsByGroupId: (groupId: number) => api.get(`/FeatureDefinitions/getbygroupid?groupId=${groupId}`),
    addFeatureDefinition: (def: any) => api.post("/FeatureDefinitions/add", def),
    updateFeatureDefinition: (def: any) => api.post("/FeatureDefinitions/update", def),
    deleteFeatureDefinition: (id: number) => api.post(`/FeatureDefinitions/delete?id=${id}`),

    // Kurum Feature Değerleri (YENİ)
    getInstitutionFeatures: (institutionId: number) =>
        api.get(`/InstitutionFeatures/getall/${institutionId}`),
    setInstitutionFeature: (institutionId: number, key: string, value: string) =>
        api.post(`/InstitutionFeatures/set/${institutionId}`, { key, value }),
    setInstitutionFeaturesBulk: (institutionId: number, values: Record<string, string>) =>
        api.post(`/InstitutionFeatures/setbulk/${institutionId}`, values),
    invalidateInstitutionCache: (institutionId: number) =>
        api.post(`/InstitutionFeatures/invalidatecache/${institutionId}`),
};
