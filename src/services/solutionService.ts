import api from './api';
import type { IDataResult, IResult, SolutionDetailDto } from '../types';

// Çözüm eklerken göndereceğimiz veri tipi (Bunu burada veya types'da tanımlayabiliriz)
export interface SolutionAddDto {
    senderId: number;
    problemId: number;
    title: string;
    description: string;
}

export const solutionService = {
    // Bir soruna ait çözümleri getir (SolutionController/getbyproblem)
    getByProblemId: async (problemId: number) => {
        return api.get<IDataResult<SolutionDetailDto[]>>(`/solution/getbyproblem?problemId=${problemId}`);
    },

    // Yeni çözüm ekle (SolutionController/add)
    add: async (data: SolutionAddDto) => {
        return api.post<IResult>('/solution/add', data);
    },

    // Mevcut fonksiyonların yanına ekle:
    getBySender: async (senderId: number) => {
        return api.get<IDataResult<SolutionDetailDto[]>>(`/solution/getbysender?senderId=${senderId}`);
    },
};