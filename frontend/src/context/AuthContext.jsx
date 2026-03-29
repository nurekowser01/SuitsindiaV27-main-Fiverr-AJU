import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Page permission mapping for admin routes
const ADMIN_PAGE_PERMISSIONS = {
  '/admin/dashboard': 'dashboard',
  '/admin/products': 'products',
  '/admin/styling': 'styling',
  '/admin/measurements': 'measurements',
  '/admin/orders': 'orders',
  '/admin/users': 'users',
  '/admin/pages': 'pages',
  '/admin/stripe': 'stripe',
  '/admin/marketing': 'marketing',
  '/admin/settings': 'settings',
  '/admin/ui': 'dashboard', // UI manager is part of dashboard
  '/admin/content': 'pages', // Content editor is part of pages
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token') || localStorage.getItem('reseller_token') || localStorage.getItem('partner_token'));
  const [loading, setLoading] = useState(true);
  const [authType, setAuthType] = useState(null); // 'admin', 'reseller', or 'partner'
  const [loggingOut, setLoggingOut] = useState(false); // Flag to prevent redirect during logout

  useEffect(() => {
    const initAuth = async () => {
      // Determine which token to use based on current URL path
      const currentPath = window.location.pathname;
      let savedToken = null;
      let type = null;
      
      // Priority based on current URL path
      if (currentPath.startsWith('/admin')) {
        // Admin routes - check admin token first
        savedToken = localStorage.getItem('admin_token');
        type = 'admin';
      } else if (currentPath.startsWith('/partner')) {
        // Partner routes - check partner token first
        savedToken = localStorage.getItem('partner_token');
        type = 'partner';
        if (!savedToken) {
          // Fallback to reseller token for partner (in case of shared login endpoint)
          savedToken = localStorage.getItem('reseller_token');
          type = 'reseller';
        }
      } else if (currentPath.startsWith('/reseller')) {
        // Reseller routes - check reseller token first, NOT partner token
        savedToken = localStorage.getItem('reseller_token');
        type = 'reseller';
      } else {
        // Default fallback for other routes (e.g., public pages)
        // Check admin first, then partner, then reseller
        savedToken = localStorage.getItem('admin_token');
        type = 'admin';
        if (!savedToken) {
          savedToken = localStorage.getItem('partner_token');
          type = 'partner';
        }
        if (!savedToken) {
          savedToken = localStorage.getItem('reseller_token');
          type = 'reseller';
        }
      }
      
      if (savedToken) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          const userData = response.data;
          setUser(userData);
          setToken(savedToken);
          
          // Determine auth type from user role (more reliable than token key)
          if (userData.role === 'admin' || userData.is_admin) {
            setAuthType('admin');
          } else if (userData.role === 'sales_partner') {
            setAuthType('partner');
          } else if (userData.role_id === 'staff' || userData.role === 'staff') {
            setAuthType('staff');
          } else {
            setAuthType('reseller');
          }
        } catch (error) {
          console.error('Auth validation error:', error);
          
          // Clear all tokens on any auth error (expired, invalid, etc.)
          localStorage.removeItem('admin_token');
          localStorage.removeItem('reseller_token');
          localStorage.removeItem('partner_token');
          setToken(null);
          setUser(null);
          setAuthType(null);
          
          // Log specific error for debugging
          if (error.response?.status === 401) {
            console.log('🔐 Token invalid/expired on app load - cleared');
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Admin login
  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await axios.post(`${API}/auth/admin/login`, {
        email,
        password,
        remember_me: rememberMe,
      });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('admin_token', access_token);
      localStorage.removeItem('reseller_token');
      localStorage.removeItem('partner_token');
      setToken(access_token);
      setUser(userData);
      setAuthType('admin');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  // Reseller login (only for reseller role)
  const resellerLogin = async (email, password, rememberMe = false) => {
    try {
      const response = await axios.post(`${API}/auth/reseller/login`, {
        email,
        password,
        remember_me: rememberMe,
      });
      const { access_token, user: userData } = response.data;
      
      // Check if user is actually a reseller or staff (not sales_partner)
      if (userData.role === 'sales_partner') {
        return {
          success: false,
          error: 'Please use the Sales Partner portal to login',
        };
      }
      
      localStorage.setItem('reseller_token', access_token);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('partner_token');
      setToken(access_token);
      setUser(userData);
      // Staff uses reseller portal with restricted access
      setAuthType(userData.role_id === 'staff' ? 'staff' : 'reseller');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  // Sales Partner login
  const partnerLogin = async (email, password, rememberMe = false) => {
    try {
      const response = await axios.post(`${API}/auth/reseller/login`, {
        email,
        password,
        remember_me: rememberMe,
      });
      const { access_token, user: userData } = response.data;
      
      // Check if user is actually a sales partner
      if (userData.role !== 'sales_partner') {
        return {
          success: false,
          error: 'Please use the Reseller portal to login',
        };
      }
      
      localStorage.setItem('partner_token', access_token);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('reseller_token');
      setToken(access_token);
      setUser(userData);
      setAuthType('partner');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const logout = () => {
    // Set logging out flag BEFORE clearing state to prevent ProtectedRoute redirects
    setLoggingOut(true);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('reseller_token');
    localStorage.removeItem('partner_token');
    setToken(null);
    setUser(null);
    setAuthType(null);
    // Reset the flag after a short delay to allow navigation to complete
    setTimeout(() => setLoggingOut(false), 100);
  };

  // Check if user has permission for a specific page
  const hasPermission = (pageId, requiredLevel = 'view') => {
    if (!user) return false;
    
    // Admins with is_admin flag have full access
    if (user.is_admin) return true;
    
    // Check role permissions
    const permissions = user.permissions?.pages || {};
    const pageAccess = permissions[pageId];
    
    if (!pageAccess || pageAccess === 'none') return false;
    if (requiredLevel === 'view') return pageAccess === 'view' || pageAccess === 'edit';
    if (requiredLevel === 'edit') return pageAccess === 'edit';
    
    return false;
  };

  // Check if user can access a specific route
  const canAccessRoute = (path) => {
    if (!user) return false;
    if (user.is_admin) return true;
    
    // Find the page ID for this route
    const pageId = ADMIN_PAGE_PERMISSIONS[path];
    if (!pageId) return true; // Unknown routes are accessible
    
    return hasPermission(pageId, 'view');
  };

  // Check if user is authenticated as admin
  const isAdmin = () => {
    return authType === 'admin' && user && (user.is_admin || user.role === 'admin');
  };

  // Check if user is authenticated as reseller
  const isReseller = () => {
    return authType === 'reseller' && user;
  };

  // Check if user is authenticated as staff
  const isStaff = () => {
    return authType === 'staff' && user && user.role_id === 'staff';
  };

  // Check if user is either reseller or staff (for shared portal access)
  const isResellerOrStaff = () => {
    return (authType === 'reseller' || authType === 'staff') && user;
  };

  // Get user's role for UI decisions
  const getUserRole = () => {
    if (!user) return null;
    return user.role_id || user.role || null;
  };

  // Get staff's parent reseller email (if staff)
  const getParentResellerEmail = () => {
    if (!user || user.role_id !== 'staff') return null;
    return user.parent_reseller_email || null;
  };

  // Get staff margins (if staff)
  const getStaffMargins = () => {
    if (!user || user.role_id !== 'staff') return null;
    return user.margins || null;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      authType,
      loggingOut,
      login, 
      resellerLogin,
      partnerLogin,
      logout,
      hasPermission,
      canAccessRoute,
      isAdmin,
      isReseller,
      isStaff,
      isResellerOrStaff,
      getUserRole,
      getParentResellerEmail,
      getStaffMargins,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
