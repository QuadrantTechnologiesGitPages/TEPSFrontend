// src/modules/benchSales/services/authService.js
const API_URL = 'http://localhost:5000/api';

class AuthService {
  constructor() {
    this.isAuthenticating = false;
  }

  // Open OAuth popup and handle authentication
  async authenticateWithProvider(provider) {
    return new Promise((resolve, reject) => {
      // Get auth URL from backend
      fetch(`${API_URL}/auth/${provider}`)
        .then(res => res.json())
        .then(data => {
          if (!data.success || !data.url) {
            throw new Error('Failed to get auth URL');
          }

          // Open popup window
          const width = 500;
          const height = 600;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;

          const authWindow = window.open(
            data.url,
            'OAuth Login',
            `width=${width},height=${height},left=${left},top=${top}`
          );

          // Listen for messages from popup
          const messageHandler = (event) => {
            // Verify origin
            if (event.origin !== 'http://localhost:5000') return;

            if (event.data.type === 'oauth-success') {
              // Store token and user info
              localStorage.setItem(`${provider}_token`, event.data.token);
              localStorage.setItem(`${provider}_user`, JSON.stringify(event.data.user));
              localStorage.setItem('current_auth_provider', provider);
              
              window.removeEventListener('message', messageHandler);
              
              resolve({
                success: true,
                token: event.data.token,
                user: event.data.user,
                provider: provider
              });
            } else if (event.data.type === 'oauth-error') {
              window.removeEventListener('message', messageHandler);
              reject(new Error(event.data.error));
            }
          };

          window.addEventListener('message', messageHandler);

          // Check if popup was closed
          const checkInterval = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkInterval);
              window.removeEventListener('message', messageHandler);
              // Don't reject here, as the popup might have succeeded
            }
          }, 1000);
        })
        .catch(error => {
          console.error('Auth error:', error);
          reject(error);
        });
    });
  }

  // Check if user is authenticated
  async checkAuthStatus(email) {
    try {
      const response = await fetch(`${API_URL}/auth/status/${email}`);
      const data = await response.json();
      return data.success ? data.status : { google: false, microsoft: false };
    } catch (error) {
      console.error('Error checking auth status:', error);
      return { google: false, microsoft: false };
    }
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      return data.success ? data.user : null;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  // Disconnect OAuth
  async disconnect(email, provider) {
    try {
      const response = await fetch(`${API_URL}/auth/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, provider })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.removeItem(`${provider}_token`);
        localStorage.removeItem(`${provider}_user`);
      }
      
      return data;
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  }

  // Get stored auth info
  getStoredAuth(provider) {
    const token = localStorage.getItem(`${provider}_token`);
    const user = localStorage.getItem(`${provider}_user`);
    
    if (token && user) {
      return {
        token,
        user: JSON.parse(user),
        provider
      };
    }
    
    return null;
  }

  // Clear all auth data
  clearAuth() {
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_user');
    localStorage.removeItem('microsoft_token');
    localStorage.removeItem('microsoft_user');
    localStorage.removeItem('current_auth_provider');
  }
}

export default new AuthService();