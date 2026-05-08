import api from './api';

export const legalAgreementService = {
  getActive: () => api.get('/legalagreement/active'),
  hasPending: () => api.get('/legalagreement/has-pending'),
  accept: (agreementId: number) => api.post(`/legalagreement/accept?agreementId=${agreementId}`),
};
