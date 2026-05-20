import api from './api';
import type { IDataResult, IResult, ProblemDetailDto, ProblemAddDto, ProblemFilterDto } from '../types';

export const problemService = {

    // Filtreli Listeleme (ProblemController/getlist)
    getList: async (filterDto: ProblemFilterDto & { page?: number; pageSize?: number; isOfficialResponse?: boolean }) => {
        // Objedeki null, undefined veya boş string olanları temizleyip URL parametresine çevirir
        const queryParams = new URLSearchParams();
        Object.entries(filterDto).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value.toString());
            }
        });

        return api.get(`/problem/getlist?${queryParams.toString()}`);
    },


    // Tüm sorunları detaylı getir (ProblemController/getlist)
    // Not: Backend'de GetList filtresiz çağrılırsa tümünü getiriyor.
    getAll: async () => {
        return api.get<IDataResult<ProblemDetailDto[]>>('/problem/getlist');
    },

    // ID'ye göre tek bir sorun getir
    getById: async (id: number) => {
        return api.get<IDataResult<ProblemDetailDto>>(`/problem/getbyid?id=${id}`);
    },

    // Yeni sorun ekle
    add: async (data: ProblemAddDto) => {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('cityCode', data.cityCode.toString());
        if (data.customHierarchyId !== undefined && data.customHierarchyId !== null) {
            formData.append('CustomHierarchyId', data.customHierarchyId.toString());
        }

        if (data.address) {
            formData.append('Address', data.address);
        }
        if (data.latitude !== undefined && data.latitude !== null) {
            formData.append('Latitude', data.latitude.toString());
        }
        if (data.longitude !== undefined && data.longitude !== null) {
            formData.append('Longitude', data.longitude.toString());
        }

        if (data.topicIds && data.topicIds.length > 0) {
            data.topicIds.forEach(id => {
                formData.append('TopicIds', id.toString());
            });
        }

        if (data.images && data.images.length > 0) {
            data.images.forEach(img => {
                formData.append('Images', img);
            });
        }
        if (data.solutionTitle) {
            formData.append('SolutionTitle', data.solutionTitle);
        }
        if (data.solutionDescription) {
            formData.append('SolutionDescription', data.solutionDescription);
        }
        if (data.solutionImages && data.solutionImages.length > 0) {
            data.solutionImages.forEach(img => {
                formData.append('SolutionImages', img);
            });
        }

        return api.post<IResult>('/problem/add', formData);
    },

    // Mevcut fonksiyonların yanına ekle:
    getBySender: async (senderId: number) => {
        return api.get<IDataResult<ProblemDetailDto[]>>(`/problem/getbysender?senderId=${senderId}`);
    },

    update: async (problem: any) => {
        const formData = new FormData();

        const sendDateValue = problem.sendDate instanceof Date
            ? problem.sendDate.toISOString()
            : String(problem.sendDate ?? '');

        formData.append('Id', String(problem.id));
        formData.append('SenderId', String(problem.senderId));
        formData.append('Title', String(problem.title ?? ''));
        formData.append('Description', String(problem.description ?? ''));
        formData.append('CityCode', String(problem.cityCode ?? 0));
        if (problem.customHierarchyId !== undefined && problem.customHierarchyId !== null) {
            formData.append('CustomHierarchyId', String(problem.customHierarchyId));
        }

        formData.append('ClearLocation', String(!!problem.clearLocation));

        if (problem.address !== undefined) {
            formData.append('Address', String(problem.address ?? ''));
        }
        if (problem.latitude !== undefined && problem.latitude !== null) {
            formData.append('Latitude', String(problem.latitude));
        }
        if (problem.longitude !== undefined && problem.longitude !== null) {
            formData.append('Longitude', String(problem.longitude));
        }

        if (problem.imageUrls !== undefined) {
            formData.append('ImageUrls', String(problem.imageUrls ?? ''));
        }
        if (problem.images && problem.images.length > 0) {
            problem.images.forEach((img: File) => {
                formData.append('Images', img);
            });
        }

        formData.append('SendDate', sendDateValue);
        formData.append('IsHighlighted', String(!!problem.isHighlighted));
        formData.append('IsReported', String(!!problem.isReported));
        formData.append('IsDeleted', String(!!problem.isDeleted));
        formData.append('IsResolved', String(!!problem.isResolved));
        formData.append('InstitutionId', String(problem.institutionId ?? 0));
        formData.append('ViewCount', String(problem.viewCount ?? 0));

        const topicIds: number[] = problem.topicIds || [];
        topicIds.forEach((id: number) => {
            formData.append('TopicIds', String(id));
        });

        return api.post('/problem/update', formData);
    },
    // delete metodunu şu şekilde değiştir:
    // Sorun Silme
    delete: async (id: number) => {
        return api.delete<IResult>(`/problem/delete?id=${id}`);
    },

    // Tıklanma / Görüntülenme sayısını artırır
    incrementView: async (id: number) => {
        return api.post(`/problem/incrementview?id=${id}`);
    },
};