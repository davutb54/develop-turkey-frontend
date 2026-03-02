import api from './api';
import type { IDataResult, IResult, CommentDetailDto, CommentAddDto } from '../types';

export const commentService = {
    // Bir çözüme ait yorumları getir
    getListBySolution: async (solutionId: number) => {
        return api.get<IDataResult<CommentDetailDto[]>>(`/comment/getbysolution?solutionId=${solutionId}`);
    },

    // Yeni yorum ekle
    add: async (data: CommentAddDto) => {
        return api.post<IResult>('/comment/add', data);
    },
    // Yorum Güncelle
    update: async (data: { id: number; content: string }) => {
        return api.post<IResult>('/comment/update', data);
    },
    // delete metodunu şu şekilde değiştir:
    // Yorum Silme
    delete: async (id: number) => {
        return api.delete<IResult>(`/comment/delete?id=${id}`);
    }
};