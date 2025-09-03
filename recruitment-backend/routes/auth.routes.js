// recruitment-backend/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const oauthService = require('../services/oauthService');
const database = require('../utils/database');

// ==================== GOOGLE OAuth ====================

// Start Google OAuth flow
router.get('/google', (req, res) => {
  try {
    const state = req.query.state || 'default';
    const authUrl = oauthService.getGoogleAuthUrl(state);
    
    // Return URL for frontend to open in popup
    res.json({ 
      success: true,
      url: authUrl 
    });
  } catch (error) {
    console.error('Error starting Google OAuth:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start Google authentication' 
    });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    // Handle the OAuth callback
    const result = await oauthService.handleGoogleCallback(code);
    
    // Create success page that closes the popup and sends data to parent
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .message {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .success-icon {
            font-size: 48px;
            color: #48bb78;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="message">
          <div class="success-icon">✅</div>
          <h2>Authentication Successful!</h2>
          <p>You can close this window now.</p>
        </div>
        <script>
          // Send message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-success',
              provider: 'google',
              token: '${result.token}',
              user: ${JSON.stringify(result.user)}
            }, '${process.env.FRONTEND_URL || 'http://localhost:3000'}');
            
            // Close popup after a short delay
            setTimeout(() => window.close(), 2000);
          }
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f7fafc;
          }
          .message {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .error-icon {
            font-size: 48px;
            color: #f56565;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="message">
          <div class="error-icon">❌</div>
          <h2>Authentication Failed</h2>
          <p>${error.message}</p>
          <p>You can close this window and try again.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-error',
              provider: 'google',
              error: '${error.message}'
            }, '${process.env.FRONTEND_URL || 'http://localhost:3000'}');
            
            setTimeout(() => window.close(), 3000);
          }
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  }
});

// ==================== MICROSOFT OAuth ====================

// Start Microsoft OAuth flow
router.get('/microsoft', async (req, res) => {
  try {
    const state = req.query.state || 'default';
    const authUrl = await oauthService.getMicrosoftAuthUrl(state);
    
    res.json({ 
      success: true,
      url: authUrl 
    });
  } catch (error) {
    console.error('Error starting Microsoft OAuth:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start Microsoft authentication' 
    });
  }
});

// Microsoft OAuth callback
router.get('/microsoft/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    // Handle the OAuth callback
    const result = await oauthService.handleMicrosoftCallback(code);
    
    // Create success page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #00a4ef 0%, #0078d4 100%);
          }
          .message {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .success-icon {
            font-size: 48px;
            color: #48bb78;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="message">
          <div class="success-icon">✅</div>
          <h2>Microsoft Authentication Successful!</h2>
          <p>You can close this window now.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-success',
              provider: 'microsoft',
              token: '${result.token}',
              user: ${JSON.stringify(result.user)}
            }, '${process.env.FRONTEND_URL || 'http://localhost:3000'}');
            
            setTimeout(() => window.close(), 2000);
          }
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f7fafc;
          }
          .message {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .error-icon {
            font-size: 48px;
            color: #f56565;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="message">
          <div class="error-icon">❌</div>
          <h2>Authentication Failed</h2>
          <p>${error.message}</p>
          <p>You can close this window and try again.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-error',
              provider: 'microsoft',
              error: '${error.message}'
            }, '${process.env.FRONTEND_URL || 'http://localhost:3000'}');
            
            setTimeout(() => window.close(), 3000);
          }
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  }
});

// ==================== TOKEN MANAGEMENT ====================

// Check OAuth status for a user
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const status = await oauthService.checkOAuthStatus(email);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { email, provider } = req.body;
    
    if (!email || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Email and provider are required'
      });
    }
    
    let tokens;
    if (provider === 'google') {
      tokens = await oauthService.refreshGoogleToken(email);
    } else if (provider === 'microsoft') {
      tokens = await oauthService.refreshMicrosoftToken(email);
    } else {
      throw new Error('Invalid provider');
    }
    
    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

// Disconnect OAuth
router.post('/disconnect', async (req, res) => {
  try {
    const { email, provider } = req.body;
    
    if (!email || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Email and provider are required'
      });
    }
    
    await oauthService.disconnectOAuth(email, provider);
    
    res.json({
      success: true,
      message: `${provider} account disconnected successfully`
    });
  } catch (error) {
    console.error('Error disconnecting OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect account'
    });
  }
});

// Verify JWT token
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    const decoded = oauthService.verifyJWT(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify token'
    });
  }
});

module.exports = router;