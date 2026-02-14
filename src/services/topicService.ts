import api from './api';
import type { IDataResult, Topic } from '../types';

export const topicService = {
    // Tüm konuları getir (TopicController/getall)
    getAll: async () => {
        return api.get<IDataResult<Topic[]>>('/topic/getall');
    }
};