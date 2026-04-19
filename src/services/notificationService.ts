import api from './api';
import type { IDataResult, IResult } from '../types';
import type { Notification } from '../types';

export const notificationService = {
  getUnread: () =>
    api.get<IDataResult<Notification[]>>('/notification/get-unread'),

  getAll: (page = 1, pageSize = 10) =>
    api.get<IDataResult<Notification[]>>('/notification/get-all', {
      params: { page, pageSize },
    }),

  markAsRead: (notificationId: number) =>
    api.post<IResult>('/notification/mark-read', { notificationId }),

  markAllAsRead: () =>
    api.post<IResult>('/notification/mark-all-read'),
};
