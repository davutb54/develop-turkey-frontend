import api from './api';
import type { 
    IDataResult, 
    IResult, 
    AccessToken, 
    UserForLoginDto, 
    UserForRegisterDto, 
    UserDetailDto,
    UserPublicProfileDto,
    UserImageUpdateDto,
    UserForPasswordUpdateDto,
    UserForUpdateDto
} from '../types';

export const userService = {
    // Backend doğrudan AccessToken objesi döndürüyor (success/message sarmalayıcısı olmadan)
    login: async (data: UserForLoginDto) => {
        return api.post<AccessToken>('/user/login', data);
    },

    // Register da başarılı olursa AccessToken döndürüyor
    register: async (data: UserForRegisterDto) => {
        return api.post<AccessToken>('/user/register', data);
    },

    getById: async (id: number) => {
        return api.get<IDataResult<UserDetailDto>>(`/user/getbyid?id=${id}`);
    },

    getPublicProfile: async (id: number) => {
        return api.get<IDataResult<UserPublicProfileDto>>(`/user/getpublicprofile?id=${id}`);
    },

    getMe: async () => {
        return api.get<IDataResult<UserDetailDto>>('/user/me');
    },

    logout: async () => {
        return api.post<IResult>('/user/logout');
    },

    revertImpersonation: async () => {
        return api.post<IResult>('/user/revertimpersonation');
    },

    uploadProfileImage: async (data: UserImageUpdateDto) => {
        const formData = new FormData();
        formData.append('userId', data.userId.toString());
        formData.append('image', data.image);

        return api.post<IResult>('/user/uploadprofileimage', formData, {
        });
    },

    // Şifre Güncelle (UserController/updatepassword)
    updatePassword: async (data: UserForPasswordUpdateDto) => {
        return api.post<IResult>('/user/updatepassword', data);
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

    updateDetails: async (data: UserForUpdateDto) => {
        return api.post<IResult>('/user/updatedetails', data);
    },
};