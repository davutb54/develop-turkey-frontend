import api from './api';
import type { IDataResult, IResult, SolutionDetailDto, SolutionAddDto } from '../types';

export const solutionService = {
    // Bir soruna ait çözümleri getir (SolutionController/getbyproblem)
    getByProblemId: async (problemId: number) => {
        return api.get<IDataResult<SolutionDetailDto[]>>(`/solution/getbyproblem?problemId=${problemId}`);
    },

    // Yeni çözüm ekle (SolutionController/add)
    add: async (data: SolutionAddDto) => {
        const formData = new FormData();
        formData.append('problemId', data.problemId.toString());
        formData.append('title', data.title);
        formData.append('description', data.description);

        if (data.images && data.images.length > 0) {
            data.images.forEach(img => {
                formData.append('Images', img);
            });
        }

        return api.post<IResult>('/solution/add', formData);
    },

    // Mevcut fonksiyonların yanına ekle:
    getBySender: async (senderId: number) => {
        return api.get<IDataResult<SolutionDetailDto[]>>(`/solution/getbysender?senderId=${senderId}`);
    },
    getAll: async () => {
        return api.get<IDataResult<SolutionDetailDto[]>>('/solution/getall');
    },
    delete: async (id: number) => {
        // Backend int id bekliyor
        return api.delete<IResult>(`/solution/delete?id=${id}`);
    },
    update: async (data: any) => {
        const formData = new FormData();
        formData.append('Id', data.id.toString());
        formData.append('ProblemId', data.problemId.toString());
        formData.append('SenderId', data.senderId.toString());
        formData.append('Title', data.title);
        formData.append('Description', data.description);
        formData.append('SendDate', data.sendDate);
        formData.append('IsHighlighted', data.isHighlighted.toString());
        formData.append('IsReported', data.isReported.toString());
        formData.append('IsDeleted', data.isDeleted.toString());
        formData.append('ExpertApprovalStatus', data.expertApprovalStatus.toString());
        
        if (data.institutionId) {
            formData.append('InstitutionId', data.institutionId.toString());
        }

        if (data.imageUrls) {
            formData.append('ImageUrls', data.imageUrls);
        }

        if (data.images && data.images.length > 0) {
            data.images.forEach((img: File) => {
                formData.append('Images', img);
            });
        }

        return api.post<IResult>('/solution/update', formData);
    },
};