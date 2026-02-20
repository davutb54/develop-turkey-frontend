import api from './api';
import type { 
    IDataResult, 
    IResult, 
    AccessToken, 
    UserForLoginDto, 
    UserForRegisterDto, 
    UserDetailDto,
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

    updateDetails: async (data: UserForUpdateDto) => {
        return api.post<IResult>('/user/updatedetails', data);
    },
};