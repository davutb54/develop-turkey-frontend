import api from './api';
import type { IDataResult, IResult } from '../types';

// ── DTO tipleri ──────────────────────────────────────────────────────────────

export interface CapabilityDto {
    id: number;
    code: string;
    description: string;
    category?: string;
    groupKey?: string;
    pageScope: string;
    isSystem: boolean;
    isActive: boolean;
    createdAt: string;
}

export interface UserCapabilityDto {
    id: number;
    userId: number;
    capabilityId: number;
    capabilityCode: string;
    capabilityDescription: string;
    category?: string;
    institutionId?: number;
    scopeJson?: string;
    expiresAt?: string;
    grantedBy: number;
    grantedAt: string;
    revokedAt?: string;
    reason?: string;
    status: number;
}

export interface GrantCapabilityDto {
    capabilityCode: string;
    institutionId?: number;
    scopeJson?: string;
    expiresAt?: string;
    reason?: string;
}

export interface RevokeCapabilityDto {
    capabilityCode: string;
    institutionId?: number;
    reason?: string;
}

export interface CapabilityTemplateDto {
    id: number;
    name: string;
    slug?: string;
    description?: string;
    /** 0 = Rol, 1 = Paket */
    kind: number;
    isActive: boolean;
    createdAt: string;
    latestVersion?: TemplateVersionDto;
}

export interface TemplateVersionDto {
    id: number;
    templateId: number;
    version: number;
    changeNote?: string;
    publishedAt?: string;
    items: TemplateItemDto[];
}

export interface TemplateItemDto {
    id: number;
    capabilityCode: string;
    capabilityDescription?: string;
}

export interface CreateTemplateDto {
    name: string;
    description?: string;
    /** 0 = Rol, 1 = Paket */
    kind: number;
    capabilityCodes: string[];
}

export interface PublishTemplateVersionDto {
    capabilityCodes: string[];
    changeNote?: string;
}

export interface ApplyTemplateDto {
    templateVersionId: number;
    userIds: number[];
    institutionId?: number;
    expiresAt?: string;
    reason: string;
}

export interface RevokeBulkDto {
    capabilityCodes: string[];
    institutionId?: number;
    reason: string;
}

export interface RevokeAppliedTemplateDto {
    userId: number;
    institutionId?: number;
    reason: string;
}

// ── Servis ────────────────────────────────────────────────────────────────────

export const capabilityService = {
    // Capability katalogu
    getAll: () =>
        api.get<IDataResult<CapabilityDto[]>>('/capabilities'),

    getByCode: (code: string) =>
        api.get<IDataResult<CapabilityDto>>(`/capabilities/${code}`),

    getByCategory: (category: string) =>
        api.get<IDataResult<CapabilityDto[]>>(`/capabilities/category/${category}`),

    // Kullanıcı capability'leri
    getByUser: (userId: number, includeExpired = false) =>
        api.get<IDataResult<UserCapabilityDto[]>>(
            `/users/${userId}/capabilities`,
            { params: { includeExpired } }
        ),

    grant: (userId: number, dto: GrantCapabilityDto) =>
        api.post<IResult>(`/users/${userId}/capabilities/grant`, dto),

    revoke: (userId: number, dto: RevokeCapabilityDto) =>
        api.post<IResult>(`/users/${userId}/capabilities/revoke`, dto),

    revokeBulk: (userId: number, dto: RevokeBulkDto) =>
        api.post<IResult>(`/users/${userId}/capabilities/revoke-bulk`, dto),

    // Template yönetimi
    getTemplates: () =>
        api.get<IDataResult<CapabilityTemplateDto[]>>('/capability-templates'),

    getTemplateById: (id: number) =>
        api.get<IDataResult<CapabilityTemplateDto>>(`/capability-templates/${id}`),

    getTemplateVersions: (id: number) =>
        api.get<IDataResult<TemplateVersionDto[]>>(`/capability-templates/${id}/versions`),

    createTemplate: (dto: CreateTemplateDto) =>
        api.post<IResult>('/capability-templates', dto),

    publishTemplate: (id: number, dto: PublishTemplateVersionDto) =>
        api.post<IResult>(`/capability-templates/${id}/publish`, dto),

    applyTemplate: (id: number, dto: ApplyTemplateDto) =>
        api.post<IResult>(`/capability-templates/${id}/apply`, dto),

    deactivateTemplate: (id: number) =>
        api.put<IResult>(`/capability-templates/${id}/deactivate`),

    revokeApplied: (templateId: number, dto: RevokeAppliedTemplateDto) =>
        api.post<IResult>(`/capability-templates/${templateId}/revoke`, dto),
};
