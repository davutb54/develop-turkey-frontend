import api from './api';
import type {
  IDataResult,
  DynamicRule,
  SaveWorkflowDto,
  WorkflowActionDto,
  WorkflowFieldDto,
  WorkflowTriggerDto,
  WorkflowLog,
  WorkflowLogFilterDto,
} from '../types';

export const workflowService = {
  saveWorkflow: (data: SaveWorkflowDto) =>
    api.post<IDataResult<DynamicRule>>('/dynamicrule/save', data),
  getRules: () =>
    api.get<IDataResult<DynamicRule[]>>('/dynamicrule/getall'),
  deleteRule: (id: number) =>
    api.delete<IDataResult<null>>(`/dynamicrule/${id}`),
  toggleActive: (id: number) =>
    api.patch<IDataResult<null>>(`/dynamicrule/${id}/toggle`),
  getTriggers: () =>
    api.get<IDataResult<WorkflowTriggerDto[]>>('/workflowreference/triggers'),
  getFields: () =>
    api.get<IDataResult<WorkflowFieldDto[]>>('/workflowreference/fields'),
  getActions: () =>
    api.get<IDataResult<WorkflowActionDto[]>>('/workflowreference/actions'),
  getLogs: (filter: WorkflowLogFilterDto) =>
    api.get<IDataResult<WorkflowLog[]>>('/workflowlog/list', { params: filter }),
  getLogCount: (filter: WorkflowLogFilterDto) =>
    api.get<IDataResult<number>>('/workflowlog/count', { params: filter }),
  getLogById: (id: number) =>
    api.get<IDataResult<WorkflowLog>>(`/workflowlog/${id}`),
};
