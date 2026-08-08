import { requestHelper } from './api';

export const dashboardService = {
  getDashboardSummary: async () => {
    return requestHelper('/api/dashboard/summary');
  },
};
