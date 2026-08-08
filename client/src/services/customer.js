import { requestHelper } from './api';

export const customerService = {
  getCustomers: async (params = {}) => {
    const query = new URLSearchParams();
    
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.customerType && params.customerType !== 'ALL') query.append('customerType', params.customerType);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    return requestHelper(`/api/customers?${query.toString()}`);
  },

  getCustomer: async (id) => {
    return requestHelper(`/api/customers/${id}`);
  },

  createCustomer: async (data) => {
    return requestHelper('/api/customers', 'POST', data);
  },

  updateCustomer: async (id, data) => {
    return requestHelper(`/api/customers/${id}`, 'PATCH', data);
  },

  createFollowUp: async (id, noteData) => {
    return requestHelper(`/api/customers/${id}/follow-ups`, 'POST', noteData);
  },
};
