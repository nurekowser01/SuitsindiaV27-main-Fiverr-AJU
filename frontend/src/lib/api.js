/**
 * Centralized Axios instance with automatic auth header injection
 * 
 * Features:
 * - Auto-injects Authorization header from localStorage
 * - Auto-clears invalid/expired tokens on 401 response
 * - Redirects to appropriate login page on auth failure
 * 
 * Usage:
 *   import api from '../lib/api';
 *   const response = await api.get('/orders');
 *   const response = await api.post('/orders', data);
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track which token type is being used for proper redirect
let currentTokenType = null;

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (try admin first, then reseller, then partner)
    const adminToken = localStorage.getItem('admin_token');
    const resellerToken = localStorage.getItem('reseller_token');
    const partnerToken = localStorage.getItem('partner_token');
    
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      currentTokenType = 'admin';
    } else if (resellerToken) {
      config.headers.Authorization = `Bearer ${resellerToken}`;
      currentTokenType = 'reseller';
    } else if (partnerToken) {
      config.headers.Authorization = `Bearer ${partnerToken}`;
      currentTokenType = 'partner';
    } else {
      currentTokenType = null;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for automatic 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - clear invalid token and redirect to login
    if (error.response?.status === 401) {
      const errorDetail = error.response?.data?.detail || '';
      
      // Check if it's a token-related error (not just wrong password on login)
      const isTokenError = errorDetail.includes('Invalid token') || 
                          errorDetail.includes('Token expired') ||
                          errorDetail.includes('Could not validate') ||
                          errorDetail.includes('Not authenticated');
      
      // Don't clear tokens for login attempts (wrong password)
      const isLoginAttempt = error.config?.url?.includes('/login');
      
      if (isTokenError && !isLoginAttempt) {
        console.warn('🔐 Token invalid/expired, clearing session...');
        
        // Clear all tokens
        localStorage.removeItem('admin_token');
        localStorage.removeItem('reseller_token');
        localStorage.removeItem('partner_token');
        
        // Determine redirect URL based on current path or token type
        const currentPath = window.location.pathname;
        let redirectUrl = '/';
        
        if (currentPath.startsWith('/admin') || currentTokenType === 'admin') {
          redirectUrl = '/admin/login';
        } else if (currentPath.startsWith('/reseller') || currentTokenType === 'reseller') {
          redirectUrl = '/reseller/login';
        } else if (currentPath.startsWith('/partner') || currentTokenType === 'partner') {
          redirectUrl = '/partner/login';
        }
        
        // Only redirect if not already on a login page
        if (!currentPath.includes('/login')) {
          console.log(`🔄 Redirecting to ${redirectUrl}`);
          window.location.href = redirectUrl;
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Also export the base URL for cases where raw URL is needed
export { API_URL };
