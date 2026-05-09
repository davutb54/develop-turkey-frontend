import api from './api';

export const legalAgreementService = {
  getActive: () => api.get('/legalagreement/active'),
  getActiveByType: (type: string) => api.get(`/legalagreement/active/${type}`),
  hasPending: () => api.get('/legalagreement/has-pending'),
  accept: (agreementId: number) => api.post(`/legalagreement/accept?agreementId=${agreementId}`),
};
