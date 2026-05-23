import api from './api';
import type { IDataResult } from '../types';

export interface OverviewMetrics {
    totalUsers: number;
    newUsersLast7Days: number;
    totalProblems: number;
    totalSolutions: number;
    totalComments: number;
    totalCapabilityGrants: number;
    activeWorkflowDefs: number;
    workflowRunsLast24h: number;
    workflowSuccessRateLast24h: number;
    snapshotEntryCount: number;
    snapshotLoadedAt: string;
    uptimeHours: number;
    ramUsageMb: number;
    bannedUsers: number;
}

export interface DailyGrantRevoke {
    date: string;
    grants: number;
    revokes: number;
}

export interface CapabilityUsage {
    code: string;
    category: string;
    grantCount: number;
}

export interface UserCapabilityCount {
    userId: number;
    userName: string;
    capabilityCount: number;
}

export interface CategoryCount {
    category: string;
    count: number;
}

export interface CapabilityMetrics {
    snapshotEntryCount: number;
    uniqueUsers: number;
    avgCapsPerUser: number;
    snapshotLoadedAt: string;
    grantRevokeTrend: DailyGrantRevoke[];
    topCapabilities: CapabilityUsage[];
    topUsers: UserCapabilityCount[];
    categoryBreakdown: CategoryCount[];
}

export interface DailyWorkflowRun {
    date: string;
    total: number;
    success: number;
    failed: number;
}

export interface TriggerCount {
    triggerEvent: string;
    count: number;
}

export interface WorkflowRunSummary {
    id: number;
    ruleName: string;
    triggerEvent: string;
    status: string;
    errorMessage?: string;
    durationMs: number;
    executedAt: string;
}

export interface WorkflowMetrics {
    runCountTrend: DailyWorkflowRun[];
    totalRuns: number;
    successCount: number;
    failedCount: number;
    partialCount: number;
    successRate: number;
    avgDurationMs: number;
    topTriggers: TriggerCount[];
    recentFailedRuns: WorkflowRunSummary[];
}

export interface DailyUserReg {
    date: string;
    count: number;
}

export interface Contributor {
    userId: number;
    userName: string;
    problemCount: number;
    solutionCount: number;
    commentCount: number;
    total: number;
}

export interface InstitutionUserCount {
    institutionName: string;
    userCount: number;
}

export interface UserMetrics {
    totalUsers: number;
    bannedUsers: number;
    warnedUsers: number;
    unverifiedUsers: number;
    newUserTrend: DailyUserReg[];
    topContributors: Contributor[];
    perInstitution: InstitutionUserCount[];
}

export interface AuditLogEntry {
    id: number;
    actorUserId: number;
    targetUserId: number;
    action: string;
    payloadJson?: string;
    createdAt: string;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface AuditLogFilter {
    actorUserId?: number;
    targetUserId?: number;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}

export const metricsService = {
    getOverview: () =>
        api.get<IDataResult<OverviewMetrics>>('/metrics/overview'),

    getCapabilities: (from?: string, to?: string) =>
        api.get<IDataResult<CapabilityMetrics>>('/metrics/capabilities', { params: { from, to } }),

    getWorkflow: (from?: string, to?: string) =>
        api.get<IDataResult<WorkflowMetrics>>('/metrics/workflow', { params: { from, to } }),

    getUsers: (from?: string, to?: string) =>
        api.get<IDataResult<UserMetrics>>('/metrics/users', { params: { from, to } }),

    getSystemHealth: () =>
        api.get('/metrics/system-health'),

    getAuditLog: (filter: AuditLogFilter) =>
        api.get<IDataResult<PagedResult<AuditLogEntry>>>('/metrics/audit-log', { params: filter }),
};
