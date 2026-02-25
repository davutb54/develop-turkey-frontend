import api from './api';
import type { IDataResult, IResult, Topic } from '../types';

export const topicService = {
    getAll: async () => {
        return api.get<IDataResult<Topic[]>>('/topic/getall');
    },
    add: async (topic: { name: string, imageName: string }) => {
        // YENİ: imageName parametresi eklendi
        return api.post<IResult>('/topic/add', topic);
    },
    delete: async (id: number) => {
        return api.delete<IResult>(`/topic/delete?id=${id}`);
    }
};