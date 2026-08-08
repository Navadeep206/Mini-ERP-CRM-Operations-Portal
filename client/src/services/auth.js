const TOKEN_KEY = 'mini_erp_auth_token';

// Isolate token storage operations
export const tokenStorage = {
  set: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },
  get: () => localStorage.getItem(TOKEN_KEY),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const authService = {
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Authentication failed');
    }

    // Save token to localStorage via helper
    if (result.data && result.data.token) {
      tokenStorage.set(result.data.token);
    }

    return result.data;
  },

  getMe: async () => {
    const token = tokenStorage.get();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      // Clear token on 401 unauthenticated
      if (response.status === 401) {
        tokenStorage.clear();
      }
      throw new Error(result.message || 'Failed to fetch user session');
    }

    return result.data;
  },

  logout: () => {
    tokenStorage.clear();
  },
};
