import api from './api';
import type { IResult } from '../types';

export const solutionVoteService = {
    // Oy Ver (Toggle mantığı: Varsa siler, yoksa ekler veya değiştirir)
    vote: async (solutionId: number, userId: number, isUpvote: boolean) => {
        return api.post<IResult>('/solutionvote/vote', {
            solutionId,
            userId,
            isUpvote
        });
    },

    // Bir çözümün oy durumunu getir (Kaç like/dislike var)
    // Backend'de bu genellikle SolutionDetailDto içinde gelir ama 
    // kullanıcı özelinde "Ben buna oy verdim mi?" kontrolü için ayrı bir endpoint olabilir.
    // Şimdilik SolutionDetailDto içindeki sayıları kullanacağız.
};