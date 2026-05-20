import api from './api';
import type {
    IDataResult,
    IResult,
    UserDetailDto,
    UserPublicProfileDto,
    UserImageUpdateDto,
    UserForUpdateDto
} from '../types';

export const userService = {
    getById: async (id: number) => {
        return api.get<IDataResult<UserDetailDto>>(`/user/getbyid?id=${id}`);
    },

    getPublicProfile: async (id: number, institutionId: number) => {
        return api.get<IDataResult<UserPublicProfileDto>>(`/user/getpublicprofile?id=${id}&institutionId=${institutionId}`);
    },

    getPublicProfileByUserName: async (username: string, institutionId: number) => {
        return api.get<IDataResult<UserPublicProfileDto>>(`/user/getpublicprofilebyusername?username=${username}&institutionId=${institutionId}`);
    },

    getMe: async () => {
        return api.get<IDataResult<UserDetailDto>>('/user/me');
    },

    getAll: async () => {
        return api.get<IDataResult<UserDetailDto[]>>('/user/getall');
    },

    getAllPaged: async (params: {
        page?: number;
        pageSize?: number;
        searchText?: string;
        roleFilter?: string;
        emailStatus?: string;
        institutionId?: number;
    }) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.pageSize) query.append('pageSize', params.pageSize.toString());
        if (params.searchText) query.append('searchText', params.searchText);
        if (params.roleFilter) query.append('roleFilter', params.roleFilter);
        if (params.emailStatus) query.append('emailStatus', params.emailStatus);
        if (params.institutionId) query.append('institutionId', params.institutionId.toString());
        return api.get(`/user/getallpaged?${query.toString()}`);
    },

    searchMentions: async (searchText: string, institutionId?: number) => {
        const query = new URLSearchParams();
        query.append('searchText', searchText);
        if (institutionId) query.append('institutionId', institutionId.toString());
        return api.get<IDataResult<{ items: UserPublicProfileDto[] }>>(`/user/searchmentions?${query.toString()}`);
    },

    updateDetails: async (data: UserForUpdateDto) => {
        return api.post<IResult>('/user/updatedetails', data);
    },

    updateUsername: async (newUsername: string) => {
        return api.post<IResult>('/user/updateusername', JSON.stringify(newUsername), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    uploadProfileImage: async (data: UserImageUpdateDto) => {
        const formData = new FormData();
        formData.append('userId', data.userId.toString());
        formData.append('image', data.image);
        return api.post<IResult>('/user/uploadprofileimage', formData);
    },
};
