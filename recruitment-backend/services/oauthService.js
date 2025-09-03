// recruitment-backend/services/oauthService.js
const { google } = require('googleapis');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const jwt = require('jsonwebtoken');
const database = require('../utils/database');

class OAuthService {
  constructor() {
    // Initialize Google OAuth2 client
    this.googleOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
    );

    // Initialize Microsoft MSAL client
    this.msalConfig = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      }
    };
    
    this.msalClient = new ConfidentialClientApplication(this.msalConfig);
  }

  // ==================== GOOGLE OAuth ====================
  
  getGoogleAuthUrl(state) {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.googleOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent to get refresh token
      scope: scopes,
      state: state // Pass state for security
    });
  }

  async handleGoogleCallback(code) {
    try {
      // Exchange code for tokens
      const { tokens } = await this.googleOAuth2Client.getToken(code);
      this.googleOAuth2Client.setCredentials(tokens);
      
      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: this.googleOAuth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();
      
      // Save tokens to database
      await database.saveOAuthToken(userInfo.email, 'google', tokens);
      
      // Log activity
      await database.logActivity(
        null,
        null,
        'oauth_connected',
        `Google OAuth connected for ${userInfo.email}`,
        userInfo.email
      );
      
      // Generate JWT for frontend
      const jwtToken = this.generateJWT({
        email: userInfo.email,
        name: userInfo.name,
        provider: 'google',
        picture: userInfo.picture
      });
      
      return {
        success: true,
        user: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          provider: 'google'
        },
        token: jwtToken
      };
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  async refreshGoogleToken(email) {
    try {
      const tokenData = await database.getOAuthToken(email, 'google');
      
      if (!tokenData || !tokenData.refresh_token) {
        throw new Error('No refresh token found');
      }
      
      this.googleOAuth2Client.setCredentials({
        refresh_token: tokenData.refresh_token
      });
      
      const { credentials } = await this.googleOAuth2Client.refreshAccessToken();
      
      // Update tokens in database
      await database.saveOAuthToken(email, 'google', credentials);
      
      return credentials;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      throw error;
    }
  }

  // ==================== MICROSOFT OAuth ====================
  
  getMicrosoftAuthUrl(state) {
    const authCodeUrlParameters = {
      scopes: [
        'User.Read',
        'Mail.Send',
        'Mail.Read',
        'offline_access'
      ],
      redirectUri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/microsoft/callback`,
      state: state
    };

    return this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
  }

  async handleMicrosoftCallback(code) {
    try {
      const tokenRequest = {
        code: code,
        scopes: ['User.Read', 'Mail.Send', 'Mail.Read', 'offline_access'],
        redirectUri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/microsoft/callback`,
      };
      
      // Exchange code for tokens
      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      
      // Get user info from account
      const userInfo = response.account;
      
      // Save tokens to database
      const tokens = {
        access_token: response.accessToken,
        refresh_token: response.refreshToken,
        expiry_date: response.expiresOn ? response.expiresOn.getTime() : null
      };
      
      await database.saveOAuthToken(userInfo.username, 'microsoft', tokens);
      
      // Log activity
      await database.logActivity(
        null,
        null,
        'oauth_connected',
        `Microsoft OAuth connected for ${userInfo.username}`,
        userInfo.username
      );
      
      // Generate JWT for frontend
      const jwtToken = this.generateJWT({
        email: userInfo.username,
        name: userInfo.name,
        provider: 'microsoft'
      });
      
      return {
        success: true,
        user: {
          email: userInfo.username,
          name: userInfo.name,
          provider: 'microsoft'
        },
        token: jwtToken
      };
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      throw new Error('Failed to authenticate with Microsoft');
    }
  }

  async refreshMicrosoftToken(email) {
    try {
      const tokenData = await database.getOAuthToken(email, 'microsoft');
      
      if (!tokenData || !tokenData.refresh_token) {
        throw new Error('No refresh token found');
      }
      
      const refreshTokenRequest = {
        refreshToken: tokenData.refresh_token,
        scopes: ['User.Read', 'Mail.Send', 'Mail.Read'],
      };
      
      const response = await this.msalClient.acquireTokenByRefreshToken(refreshTokenRequest);
      
      // Update tokens in database
      const tokens = {
        access_token: response.accessToken,
        refresh_token: tokenData.refresh_token, // Keep the same refresh token
        expiry_date: response.expiresOn ? response.expiresOn.getTime() : null
      };
      
      await database.saveOAuthToken(email, 'microsoft', tokens);
      
      return tokens;
    } catch (error) {
      console.error('Error refreshing Microsoft token:', error);
      throw error;
    }
  }

  // ==================== Token Management ====================
  
  async getValidToken(email, provider) {
    try {
      const tokenData = await database.getOAuthToken(email, provider);
      
      if (!tokenData) {
        throw new Error('No token found for user');
      }
      
      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now >= expiresAt) {
        // Token expired, refresh it
        console.log(`Token expired for ${email}, refreshing...`);
        
        if (provider === 'google') {
          return await this.refreshGoogleToken(email);
        } else if (provider === 'microsoft') {
          return await this.refreshMicrosoftToken(email);
        }
      }
      
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      };
    } catch (error) {
      console.error('Error getting valid token:', error);
      throw error;
    }
  }

  // ==================== JWT Generation ====================
  
  generateJWT(userData) {
    const payload = {
      email: userData.email,
      name: userData.name,
      provider: userData.provider,
      picture: userData.picture || null,
      timestamp: Date.now()
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });
  }

  verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  // ==================== Disconnect OAuth ====================
  
  async disconnectOAuth(email, provider) {
    try {
      await database.run(
        'DELETE FROM oauth_tokens WHERE user_email = ? AND provider = ?',
        [email, provider]
      );
      
      await database.logActivity(
        null,
        null,
        'oauth_disconnected',
        `${provider} OAuth disconnected for ${email}`,
        email
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting OAuth:', error);
      throw error;
    }
  }

  // ==================== Check OAuth Status ====================
  
  async checkOAuthStatus(email) {
    try {
      const googleToken = await database.getOAuthToken(email, 'google');
      const microsoftToken = await database.getOAuthToken(email, 'microsoft');
      
      return {
        google: !!googleToken,
        microsoft: !!microsoftToken
      };
    } catch (error) {
      console.error('Error checking OAuth status:', error);
      return {
        google: false,
        microsoft: false
      };
    }
  }
}

module.exports = new OAuthService();