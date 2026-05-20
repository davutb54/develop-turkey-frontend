import api from './api';
import type { IResult, IDataResult, AccessToken, VerifyEmailDto, ResetPasswordDto, UserForLoginDto, UserForRegisterDto, UserForPasswordUpdateDto } from '../types';

export const authService = {
    login: async (data: UserForLoginDto) => {
        return api.post<AccessToken>('/auth/login', data);
    },

    googleLogin: (credential: string) => api.post('/auth/google-login', { credential }),

    register: async (data: UserForRegisterDto) => {
        return api.post<AccessToken>('/auth/register', data);
    },

    updatePassword: async (data: UserForPasswordUpdateDto) => {
        return api.post<IResult>('/auth/updatepassword', data);
    },

    logout: async () => {
        return api.post<IResult>('/auth/logout');
    },

    revertImpersonation: async () => {
        return api.post<IResult>('/auth/revertimpersonation');
    },

    verifyEmail: async (data: VerifyEmailDto) => {
        return api.post<IResult>('/auth/verifyemail', data);
    },

    resendVerification: async (email: string) => {
        return api.post<string>('/auth/resendverification', JSON.stringify(email), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    forgotPassword: async (email: string) => {
        return api.post<string>('/auth/forgotpassword', JSON.stringify(email), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    resetPassword: async (data: ResetPasswordDto) => {
        return api.post<string>('/auth/resetpassword', data);
    },
};
