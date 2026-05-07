import api from './api';

export const actionService = {
  toggleProblemFollow: (problemId: number) => api.post(`/action/toggle-problem-follow?problemId=${problemId}`),
  toggleSolutionSave: (solutionId: number) => api.post(`/action/toggle-solution-save?solutionId=${solutionId}`),
  checkProblemFollow: (problemId: number) => api.get(`/action/check-problem-follow?problemId=${problemId}`),
  checkSolutionSave: (solutionId: number) => api.get(`/action/check-solution-save?solutionId=${solutionId}`)
};
