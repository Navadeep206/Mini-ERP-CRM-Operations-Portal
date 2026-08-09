import { tokenStorage } from './auth';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
API_URL = API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const requestHelper = async (endpoint, method = 'GET', body = null) => {
  const token = tokenStorage.get();
  if (!token) {
    throw new Error('Authentication session token is missing');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const result = await response.json();

  if (!response.ok) {
    // Force logout / redirect on 401 unauthenticated
    if (response.status === 401) {
      tokenStorage.clear();
      window.location.href = '/login';
    }
    const error = new Error(result.message || 'API request failed');
    error.status = response.status;
    if (result.errors) {
      error.errors = result.errors;
    }
    throw error;
  }

  if (Array.isArray(result.data)) {
    return Object.assign(result.data, {
      pagination: result.pagination,
      message: result.message,
    });
  }

  if (result.data && typeof result.data === 'object') {
    return {
      ...result.data,
      ...(result.pagination ? { pagination: result.pagination } : {}),
      ...(result.message ? { message: result.message } : {}),
    };
  }

  return result.data;
};
