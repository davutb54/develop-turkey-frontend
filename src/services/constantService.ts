import api from './api';
import type { IDataResult, City, Gender } from '../types';

export const constantService = {
    getCities: async () => {
        return api.get<IDataResult<City[]>>('/constant/cities');
    },
    getGenders: async () => {
        return api.get<IDataResult<Gender[]>>('/constant/genders');
    }
};