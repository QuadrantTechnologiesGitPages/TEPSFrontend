import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { isAuthenticated, hasRole, canPerformAction } = useAuth();

  if (!isAuthenticated) {
    return null; // Will be handled by App.js
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  if (requiredPermission) {
    const { action, module } = requiredPermission;
    if (!canPerformAction(action, module)) {
      return (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to perform this action.</p>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;