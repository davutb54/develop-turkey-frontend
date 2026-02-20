import api from './api';
import type { IDataResult, IResult, Topic } from '../types';

export const topicService = {
    getAll: async () => {
        return api.get<IDataResult<Topic[]>>('/topic/getall');
    },
    add: async (topic: { name: string }) => {
        return api.post<IResult>('/topic/add', topic);
    },
    delete: async (topic: Topic) => {
        // Backend Delete işlemi için body bekliyor, axios'ta body 'data' içine yazılır.
        return api.delete<IResult>('/topic/delete', { data: topic });
    }
};