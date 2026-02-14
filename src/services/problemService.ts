import api from './api';
import type { IDataResult, IResult, ProblemDetailDto, ProblemAddDto, ProblemFilterDto } from '../types';

export const problemService = {

    // Filtreli Listeleme (ProblemController/getlist)
    getList: async (filter: ProblemFilterDto) => {
        // Axios params özelliği, objeyi otomatik olarak query string'e çevirir
        // Örn: /problem/getlist?CityCode=34&TopicId=2
        return api.get<IDataResult<ProblemDetailDto[]>>('/problem/getlist', {
            params: filter
        });
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
        formData.append('senderId', data.senderId.toString());
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('cityCode', data.cityCode.toString());
        formData.append('topicId', data.topicId.toString());

        if (data.image) {
            formData.append('Image', data.image);
        }

        return api.post<IResult>('/problem/add', formData, {
        });
    },

    // Mevcut fonksiyonların yanına ekle:
    getBySender: async (senderId: number) => {
        return api.get<IDataResult<ProblemDetailDto[]>>(`/problem/getbysender?senderId=${senderId}`);
    },
};