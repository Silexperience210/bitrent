/**
 * api-client.js - API Client with JWT Management & Error Handling
 * Handles all communication with the Vercel backend API
 */

class APIClient {
  constructor(config = CONFIG) {
    this.config = config;
    this.baseURL = config.API.BASE_URL;
    this.timeout = config.API.TIMEOUT;
    this.retryAttempts = config.API.RETRY_ATTEMPTS;
    this.retryDelay = config.API.RETRY_DELAY;

    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };

    this.setupDefaultInterceptors();
  }

  /**
   * Setup default interceptors for JWT management and error handling
   */
  setupDefaultInterceptors() {
    // Request interceptor: Add JWT token to headers
    this.interceptors.request.push((config) => {
      const token = this.getToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: Handle token refresh
    this.interceptors.response.push(async (response) => {
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.retry(response.config);
        }
      }
      return response;
    });

    // Error interceptor: Standard error handling
    this.interceptors.error.push((error) => {
      return this.handleError(error);
    });
  }

  /**
   * Add custom request interceptor
   */
  addRequestInterceptor(fn) {
    this.interceptors.request.push(fn);
  }

  /**
   * Add custom response interceptor
   */
  addResponseInterceptor(fn) {
    this.interceptors.response.push(fn);
  }

  /**
   * Add custom error interceptor
   */
  addErrorInterceptor(fn) {
    this.interceptors.error.push(fn);
  }

  /**
   * Apply request interceptors
   */
  async applyRequestInterceptors(config) {
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config);
    }
    return config;
  }

  /**
   * Apply response interceptors
   */
  async applyResponseInterceptors(response) {
    for (const interceptor of this.interceptors.response) {
      response = await interceptor(response);
    }
    return response;
  }

  /**
   * Apply error interceptors
   */
  async applyErrorInterceptors(error) {
    for (const interceptor of this.interceptors.error) {
      error = await interceptor(error);
    }
    return error;
  }

  /**
   * Get JWT token from localStorage
   */
  getToken() {
    return localStorage.getItem(this.config.AUTH.JWT_STORAGE_KEY);
  }

  /**
   * Set JWT token in localStorage
   */
  setToken(token) {
    localStorage.setItem(this.config.AUTH.JWT_STORAGE_KEY, token);
  }

  /**
   * Remove JWT token
   */
  clearToken() {
    localStorage.removeItem(this.config.AUTH.JWT_STORAGE_KEY);
  }

  /**
   * Refresh JWT token
   */
  async refreshToken() {
    try {
      const response = await this.rawRequest('/api/auth/refresh', {
        method: 'POST',
        skipAuth: true,
      });

      if (response.token) {
        this.setToken(response.token);
        return true;
      }
      return false;
    } catch (error) {
      this.clearToken();
      this.redirectToLogin();
      return false;
    }
  }

  /**
   * Retry a failed request
   */
  async retry(config, attempt = 1) {
    if (attempt > this.retryAttempts) {
      throw new Error('Max retry attempts reached');
    }

    const delay = this.retryDelay * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return this.rawRequest(config.url, {
      ...config,
      attempt: attempt + 1,
    });
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data,
    });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data,
    });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Unified request handler with retry logic
   */
  async request(url, options = {}) {
    const { attempt = 1, skipAuth = false, ...rest } = options;

    let config = {
      url,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...rest,
    };

    try {
      // Apply request interceptors
      if (!skipAuth) {
        config = await this.applyRequestInterceptors(config);
      }

      // Make request
      const response = await this.rawRequest(url, config);

      // Apply response interceptors
      return await this.applyResponseInterceptors(response);
    } catch (error) {
      // Apply error interceptors
      await this.applyErrorInterceptors(error);

      // Retry logic for network errors
      if (
        this.isRetryable(error) &&
        attempt <= this.retryAttempts
      ) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request(url, {
          ...options,
          attempt: attempt + 1,
        });
      }

      throw error;
    }
  }

  /**
   * Raw fetch wrapper with timeout
   */
  async rawRequest(url, config) {
    const fullURL = url.startsWith('http')
      ? url
      : `${this.baseURL}${url}`;

    const fetchConfig = {
      method: config.method || 'GET',
      headers: config.headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    // Add body if present
    if (config.body) {
      if (typeof config.body === 'string') {
        fetchConfig.body = config.body;
      } else {
        fetchConfig.body = JSON.stringify(config.body);
      }
    }

    const response = await fetch(fullURL, fetchConfig);

    // Parse response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      const error = new APIError(
        data.message || `HTTP ${response.status}`,
        response.status,
        data
      );

      // Handle 401 - Unauthorized
      if (response.status === 401) {
        this.clearToken();
        this.redirectToLogin();
      }

      // Handle 403 - Forbidden
      if (response.status === 403) {
        error.type = 'FORBIDDEN';
      }

      throw error;
    }

    return data;
  }

  /**
   * Determine if error is retryable
   */
  isRetryable(error) {
    if (error instanceof APIError) {
      // Don't retry 401/403/422 errors
      if ([401, 403, 422].includes(error.status)) {
        return false;
      }

      // Retry 5xx server errors
      if (error.status >= 500) {
        return true;
      }

      // Retry network errors
      if (
        error.type === 'NETWORK_ERROR' ||
        error.type === 'TIMEOUT'
      ) {
        return true;
      }
    }

    // Retry generic network errors
    if (
      error instanceof TypeError &&
      error.message.includes('fetch')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Handle and standardize errors
   */
  handleError(error) {
    if (error instanceof APIError) {
      return error;
    }

    if (error instanceof AbortSignal.TimeoutError) {
      return new APIError('Request timeout', 408, {
        type: 'TIMEOUT',
      });
    }

    if (error instanceof TypeError) {
      return new APIError('Network error', 0, {
        type: 'NETWORK_ERROR',
        originalError: error,
      });
    }

    return new APIError('Unknown error', 0, {
      originalError: error,
    });
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    if (typeof window !== 'undefined') {
      window.location.href = '/index.html';
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Verify JWT is valid (check expiry)
   */
  isTokenValid() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // convert to ms
      return Date.now() < expiry;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user from token
   */
  getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        pubkey: payload.pubkey,
        role: payload.role,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if current user is admin
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, status = 0, data = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
    this.type = data.type || 'API_ERROR';
    this.timestamp = Date.now();

    // Log error if debug mode
    if (CONFIG?.DEBUG) {
      console.error('[API Error]', {
        message,
        status,
        data,
      });
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    const status = this.status;
    const message = this.data.message || this.message;

    const messages = {
      0: 'Network error. Please check your connection.',
      400: 'Invalid request. Please check your input.',
      401: 'Your session expired. Please login again.',
      403: 'You do not have permission to perform this action.',
      404: 'Resource not found.',
      408: 'Request timeout. Please try again.',
      422: 'Invalid data. Please check your input.',
      429: 'Too many requests. Please slow down.',
      500: 'Server error. Please try again later.',
      502: 'Service temporarily unavailable.',
      503: 'Service maintenance. Please try again later.',
    };

    return messages[status] || message || 'An error occurred';
  }
}

/**
 * Create singleton instance
 */
const api = new APIClient(CONFIG);

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIClient, APIError, api };
}
