import api from './api';
import type { IDataResult, IResult, ProblemDetailDto, ProblemAddDto } from '../types';

export const problemService = {

    // Filtreli Listeleme (ProblemController/getlist)
    getList: async (filterDto: {
        topicId?: number;
        cityCode?: number;
        searchText?: string;
        isOfficialResponse?: boolean;
        page?: number;
        pageSize?: number;
    }) => {
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

        // YENİ: Seçilen her bir kategori ID'sini FormData'ya ekliyoruz
        if (data.topicIds && data.topicIds.length > 0) {
            data.topicIds.forEach(id => {
                formData.append('TopicIds', id.toString());
            });
        }

        if (data.image) {
            formData.append('Image', data.image);
        }
        if (data.solutionTitle) {
            formData.append('SolutionTitle', data.solutionTitle);
        }
        if (data.solutionDescription) {
            formData.append('SolutionDescription', data.solutionDescription);
        }

        return api.post<IResult>('/problem/add', formData);
    },

    // Mevcut fonksiyonların yanına ekle:
    getBySender: async (senderId: number) => {
        return api.get<IDataResult<ProblemDetailDto[]>>(`/problem/getbysender?senderId=${senderId}`);
    },

    update: async (problem: any) => {
        return api.post('/problem/update', problem);
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