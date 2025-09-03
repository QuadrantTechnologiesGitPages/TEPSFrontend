// recruitment-backend/server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./recruitment.db');

// Create tables
db.serialize(() => {
  // Forms table
  db.run(`CREATE TABLE IF NOT EXISTS forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE,
    case_id TEXT,
    candidate_email TEXT,
    sender_email TEXT,
    fields TEXT,
    status TEXT DEFAULT 'pending',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_date DATETIME,
    response_data TEXT
  )`);

  // User sessions table
  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    provider TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Google OAuth Configuration
const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/auth/google/callback'
);

// Microsoft OAuth Configuration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  }
};

const msalClient = new ConfidentialClientApplication(msalConfig);

// Generate unique token
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ==================== AUTH ENDPOINTS ====================

// Google OAuth login
app.get('/auth/google', (req, res) => {
  const url = googleOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send', 'email', 'profile'],
  });
  res.json({ url });
});

// Google OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await googleOAuth2Client.getToken(code);
  googleOAuth2Client.setCredentials(tokens);
  
  // Get user info
  const oauth2 = google.oauth2({ version: 'v2', auth: googleOAuth2Client });
  const userInfo = await oauth2.userinfo.get();
  
  // Store session
  db.run(
    `INSERT OR REPLACE INTO user_sessions (user_email, access_token, refresh_token, provider) 
     VALUES (?, ?, ?, ?)`,
    [userInfo.data.email, tokens.access_token, tokens.refresh_token, 'google']
  );
  
  // Redirect to frontend with token
  const jwtToken = jwt.sign({ email: userInfo.data.email }, process.env.JWT_SECRET);
  res.redirect(`http://localhost:3000/auth-success?token=${jwtToken}`);
});

// Microsoft OAuth login
app.get('/auth/microsoft', (req, res) => {
  const authUrl = msalClient.getAuthCodeUrl({
    scopes: ['Mail.Send', 'User.Read'],
    redirectUri: 'http://localhost:5000/auth/microsoft/callback',
  });
  res.json({ url: authUrl });
});

// ==================== FORM ENDPOINTS ====================

// Create and send form
app.post('/api/forms/send', async (req, res) => {
  const { candidateEmail, caseId, fields, senderEmail } = req.body;
  
  // Generate token
  const token = generateToken();
  
  // Save form to database
  db.run(
    `INSERT INTO forms (token, case_id, candidate_email, sender_email, fields) 
     VALUES (?, ?, ?, ?, ?)`,
    [token, caseId, candidateEmail, senderEmail, JSON.stringify(fields)]
  );
  
  // Get user's OAuth tokens
  db.get(
    `SELECT * FROM user_sessions WHERE user_email = ?`,
    [senderEmail],
    async (err, session) => {
      if (err || !session) {
        return res.status(400).json({ error: 'User not authenticated' });
      }
      
      // Send email based on provider
      const formUrl = `http://localhost:3000/form/${token}`;
      const emailBody = `
        <h2>Information Request</h2>
        <p>Please complete the following form:</p>
        <a href="${formUrl}" style="padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
          Complete Form
        </a>
        <p>This link will expire in 7 days.</p>
      `;
      
      if (session.provider === 'google') {
        await sendGmailEmail(session, candidateEmail, 'Information Request', emailBody);
      } else if (session.provider === 'microsoft') {
        await sendOutlookEmail(session, candidateEmail, 'Information Request', emailBody);
      }
      
      res.json({ success: true, token });
    }
  );
});

// Get form by token (for candidate)
app.get('/api/forms/:token', (req, res) => {
  const { token } = req.params;
  
  db.get(
    `SELECT * FROM forms WHERE token = ?`,
    [token],
    (err, form) => {
      if (err || !form) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      if (form.status === 'completed') {
        return res.status(400).json({ error: 'Form already completed' });
      }
      
      res.json({
        fields: JSON.parse(form.fields),
        candidateEmail: form.candidate_email,
        caseId: form.case_id
      });
    }
  );
});

// Submit form response (by candidate)
app.post('/api/forms/:token/submit', (req, res) => {
  const { token } = req.params;
  const { responses } = req.body;
  
  db.run(
    `UPDATE forms 
     SET response_data = ?, status = 'completed', completed_date = CURRENT_TIMESTAMP 
     WHERE token = ?`,
    [JSON.stringify(responses), token],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to submit form' });
      }
      res.json({ success: true });
    }
  );
});

// Get form responses for a case
app.get('/api/cases/:caseId/responses', (req, res) => {
  const { caseId } = req.params;
  
  db.all(
    `SELECT * FROM forms WHERE case_id = ? ORDER BY created_date DESC`,
    [caseId],
    (err, forms) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch responses' });
      }
      res.json(forms);
    }
  );
});

// ==================== EMAIL HELPERS ====================

async function sendGmailEmail(session, to, subject, html) {
  googleOAuth2Client.setCredentials({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });
  
  const gmail = google.gmail({ version: 'v1', auth: googleOAuth2Client });
  
  const message = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    html
  ].join('\n');
  
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  });
}

async function sendOutlookEmail(session, to, subject, html) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, session.access_token);
    }
  });
  
  await client.api('/me/sendMail').post({
    message: {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: html
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    }
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});