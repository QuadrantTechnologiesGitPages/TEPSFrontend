import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/authConfig';

const msalInstance = new PublicClientApplication(msalConfig);
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        const accounts = msalInstance.getAllAccounts();
        
        if (accounts.length > 0) {
          const account = accounts[0];
          const response = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: account
          });
          
          setUser(account);
          // Extract roles from token claims
          const userRoles = response.idTokenClaims?.roles || [];
          setRoles(userRoles);
        }
      } catch (error) {
        console.error('MSAL initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeMsal();
  }, []);

  const login = async () => {
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      setUser(response.account);
      const userRoles = response.idTokenClaims?.roles || [];
      setRoles(userRoles);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    msalInstance.logoutPopup();
    setUser(null);
    setRoles([]);
  };

  const getAccessToken = async () => {
    const account = msalInstance.getAllAccounts()[0];
    if (account) {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account
      });
      return response.accessToken;
    }
    return null;
  };

  const hasRole = (role) => {
    return roles.includes(role);
  };

  const canPerformAction = (action, module) => {
    // Define permission matrix based on PDF requirements
    const permissions = {
      'Leadership': {
        'candidate': ['view', 'lookup'],
        'communication': ['view'],
      },
      'BenchSales': {
        'candidate': ['create', 'view', 'edit', 'update'],
        'communication': ['create', 'view', 'edit'],
      },
      'Recruitment': {
        'candidate': ['create', 'view', 'edit', 'update'],
        'communication': ['create', 'view', 'edit'],
      },
      'Admin': {
        'candidate': ['create', 'view', 'edit', 'update', 'delete', 'admin'],
        'communication': ['create', 'view', 'edit', 'delete', 'admin'],
      }
    };

    for (const role of roles) {
      if (permissions[role]?.[module]?.includes(action)) {
        return true;
      }
    }
    return false;
  };

  const value = {
    user,
    loading,
    roles,
    login,
    logout,
    getAccessToken,
    hasRole,
    canPerformAction,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};