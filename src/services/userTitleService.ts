import api from './api';
import type { IDataResult, IResult, UserTitleDto } from '../types';

export interface UserTitleAddDto {
    userId: number;
    label: string;
    kind: 'official' | 'expert' | 'custom';
    color?: string | null;
    icon?: string | null;
}

export const userTitleService = {
    getByUser: (userId: number) =>
        api.get<IDataResult<UserTitleDto[]>>(`/user-titles?userId=${userId}`),

    assign: (dto: UserTitleAddDto) =>
        api.post<IResult>('/user-titles', dto),

    remove: (id: number) =>
        api.delete<IResult>(`/user-titles/${id}`),
};
