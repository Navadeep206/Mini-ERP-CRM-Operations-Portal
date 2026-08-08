import { requestHelper } from './api';

export const challanService = {
  getChallans: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.customerId) query.append('customerId', params.customerId);
    return requestHelper(`/api/challans?${query.toString()}`);
  },

  getChallan: async (id) => {
    return requestHelper(`/api/challans/${id}`);
  },

  createChallan: async (data) => {
    return requestHelper('/api/challans', 'POST', data);
  },

  updateChallan: async (id, data) => {
    return requestHelper(`/api/challans/${id}`, 'PATCH', data);
  },

  confirmChallan: async (id) => {
    return requestHelper(`/api/challans/${id}/confirm`, 'POST');
  },

  cancelChallan: async (id) => {
    return requestHelper(`/api/challans/${id}/cancel`, 'POST');
  },
};
