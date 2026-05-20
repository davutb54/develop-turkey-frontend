import api from './api';
import type { EmailTemplate, IDataResult, IResult } from '../types';

export const emailTemplateService = {
  getAll: async () => {
    const response = await api.get<IDataResult<EmailTemplate[]>>('/EmailTemplates/getall');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<IDataResult<EmailTemplate>>(`/EmailTemplates/getbyid?id=${id}`);
    return response.data;
  },
  add: async (template: Omit<EmailTemplate, 'id'>) => {
    const response = await api.post<IResult>('/EmailTemplates/add', template);
    return response.data;
  },
  update: async (template: EmailTemplate) => {
    const response = await api.post<IResult>('/EmailTemplates/update', template);
    return response.data;
  },
  delete: async (template: EmailTemplate) => {
    const response = await api.post<IResult>('/EmailTemplates/delete', template);
    return response.data;
  }
};
