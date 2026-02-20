import api from './api';
import type { IResult, VerifyEmailDto, ResetPasswordDto } from '../types';

export const authService = {
    verifyEmail: async (data: VerifyEmailDto) => {
        return api.post<IResult>('/auth/verifyemail', data);
    },
    resendVerification: async (email: string) => {
        // Backend'deki [FromBody] string bekleyen metodlara JSON formatında string gönderiyoruz
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
    }
};