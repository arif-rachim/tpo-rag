import api from './api';

/**
 * Login with username and password
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{success: boolean, token?: string, username?: string, message?: string}>}
 */
export const login = async (username, password) => {
  try {
    const response = await api.post('/api/auth/login', {
      username,
      password,
    });

    if (response.data.success && response.data.token) {
      // Store token and username in localStorage
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('auth_user', response.data.username);
    }

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      success: false,
      message: error.message || 'Login failed',
    };
  }
};

/**
 * Logout current user
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const logout = async () => {
  try {
    const response = await api.post('/api/auth/logout');

    // Clear localStorage regardless of response
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    return response.data;
  } catch (error) {
    // Clear localStorage even if request fails
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      success: false,
      message: error.message || 'Logout failed',
    };
  }
};

/**
 * Get current user info
 * @returns {Promise<{success: boolean, username?: string, active_sessions?: number}>}
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      success: false,
      message: error.message || 'Failed to get user info',
    };
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth_token');
  return !!token;
};

/**
 * Get stored username
 * @returns {string|null}
 */
export const getStoredUsername = () => {
  return localStorage.getItem('auth_user');
};
