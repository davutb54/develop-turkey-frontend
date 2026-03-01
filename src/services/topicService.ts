import api from './api';
import type { IDataResult, IResult, Topic } from '../types';

export const topicService = {
    getAll: async () => {
        return api.get<IDataResult<Topic[]>>('/topic/getall');
    },
    add: async (formData: FormData) => {
        return api.post<IResult>('/topic/add', formData);
    },
    update: async (formData: FormData) => {
        return api.put<IResult>('/topic/update', formData);
    },
    delete: async (id: number) => {
        return api.delete<IResult>(`/topic/delete?id=${id}`);
    },
    getAllActive: async () => api.get<IDataResult<Topic[]>>('/topic/getallactive'),
};