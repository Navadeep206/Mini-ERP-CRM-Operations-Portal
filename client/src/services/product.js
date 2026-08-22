import { requestHelper } from './api';

export const productService = {
  getProducts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'ALL') query.append('category', params.category);
    if (params.warehouseLocation && params.warehouseLocation !== 'ALL') query.append('warehouseLocation', params.warehouseLocation);
    if (params.stockStatus && params.stockStatus !== 'ALL') query.append('stockStatus', params.stockStatus);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    return requestHelper(`/api/products?${query.toString()}`);
  },

  getProduct: async (id) => {
    return requestHelper(`/api/products/${id}`);
  },

  createProduct: async (data) => {
    return requestHelper('/api/products', 'POST', data);
  },

  updateProduct: async (id, data) => {
    return requestHelper(`/api/products/${id}`, 'PATCH', data);
  },

  getStockMovements: async (id, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return requestHelper(`/api/products/${id}/stock-movements?${query.toString()}`);
  },

  createStockMovement: async (id, movementData) => {
    return requestHelper(`/api/products/${id}/stock-movements`, 'POST', movementData);
  },

  getInventoryStats: async () => {
    return requestHelper('/api/inventory/stats');
  },

  getLowStockProducts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return requestHelper(`/api/inventory/low-stock?${query.toString()}`);
  },

  getProductForecast: async (id, horizon = 4) => {
    return requestHelper(`/api/forecast/${id}?horizon=${horizon}`);
  },

  getBulkRisk: async (horizon = 4) => {
    return requestHelper(`/api/inventory/intelligence?horizon=${horizon}`);
  },

  getProductRisk: async (id, horizon = 4) => {
    return requestHelper(`/api/inventory/intelligence/${id}?horizon=${horizon}`);
  },
};
