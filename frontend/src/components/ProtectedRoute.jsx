import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protected route for admin pages
export const AdminRoute = ({ children, pageId }) => {
  const { user, loading, isAdmin, hasPermission, loggingOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a2744] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logging out, don't redirect - let the logout handler navigate
  if (loggingOut) {
    return null;
  }

  // Not logged in - redirect to admin login
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check if user is admin
  if (!isAdmin()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check page permission if pageId is provided
  if (pageId && !hasPermission(pageId, 'view')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. Contact your administrator if you believe this is an error.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-[#1a2744] text-white rounded hover:bg-[#2a3754]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

// Protected route for reseller pages (includes staff users)
export const ResellerRoute = ({ children }) => {
  const { user, loading, isReseller, isAdmin, isStaff, isResellerOrStaff, loggingOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a962] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logging out, don't redirect - let the logout handler navigate
  if (loggingOut) {
    return null;
  }

  // Not logged in - redirect to reseller login
  if (!user) {
    return <Navigate to="/reseller/login" state={{ from: location }} replace />;
  }

  // If user is a sales partner, redirect to partner dashboard
  if (user.role === 'sales_partner') {
    return <Navigate to="/partner/dashboard" replace />;
  }

  // Check if user is reseller, staff, or admin (admins can access reseller pages)
  if (!isResellerOrStaff() && !isAdmin()) {
    return <Navigate to="/reseller/login" state={{ from: location }} replace />;
  }

  return children;
};

// Protected route for sales partner pages
export const SalesPartnerRoute = ({ children }) => {
  const { user, loading, loggingOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logging out, don't redirect - let the logout handler navigate
  if (loggingOut) {
    return null;
  }

  // Not logged in - redirect to partner login
  if (!user) {
    return <Navigate to="/partner/login" state={{ from: location }} replace />;
  }

  // Check if user is sales partner
  if (user.role !== 'sales_partner') {
    return <Navigate to="/partner/login" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute;
