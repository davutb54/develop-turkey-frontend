import api from './api';
import type { IDataResult, IResult, OfficialResponseDto } from '../types';

export interface OfficialResponseAddDto {
    problemId: number;
    body: string;
    status: 'acknowledged' | 'in_progress' | 'info' | 'closed';
}

export interface OfficialResponseUpdateStatusDto {
    status: 'acknowledged' | 'in_progress' | 'info' | 'closed';
    body?: string;
}

export const officialResponseService = {
    getByProblem: (problemId: number) =>
        api.get<IDataResult<OfficialResponseDto[]>>(`/official-responses/by-problem/${problemId}`),

    add: (dto: OfficialResponseAddDto) =>
        api.post<IResult>('/official-responses', dto),

    updateStatus: (id: number, dto: OfficialResponseUpdateStatusDto) =>
        api.put<IResult>(`/official-responses/${id}/status`, dto),

    delete: (id: number) =>
        api.delete<IResult>(`/official-responses/${id}`),
};
