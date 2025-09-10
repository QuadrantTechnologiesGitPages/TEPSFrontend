import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/Login.css';

const Login = () => {
  const { login, loading } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
        <h1>Quadrant 360</h1>
        <p>Q-CRM • Talent Intelligence Platform</p>
      </div>
              
        <div className="login-content">
          <div className="login-logo">
            <div className="logo-circle">
              <span>Q360</span>
            </div>
          </div>
          
          <button className="login-button" onClick={handleLogin}>
            <svg className="ms-logo" viewBox="0 0 23 23">
              <path fill="#f35325" d="M0 0h11v11H0z"/>
              <path fill="#81bc06" d="M12 0h11v11H12z"/>
              <path fill="#05a6f0" d="M0 12h11v11H0z"/>
              <path fill="#ffba08" d="M12 12h11v11H12z"/>
            </svg>
            Sign in with Microsoft
          </button>
          
          <p className="login-info">
            Use your organizational account to access the system
          </p>
        </div>
        
        <div className="login-footer">
          <p>© 2025 Quadrant Technologies • Q-Suites Platform</p>
        </div>
      </div>
    </div>
  );
};

export default Login;