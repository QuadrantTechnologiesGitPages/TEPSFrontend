// recruitment-backend/services/emailPoller.js

const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');

class EmailPollingService {
  constructor(db) {
    this.db = db;
    this.pollingInterval = 60000; // 1 minute
    this.isPolling = false;
  }

  startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('📧 Starting email polling service...');
    
    setInterval(() => {
      this.checkForResponses();
    }, this.pollingInterval);
  }

  async checkForResponses() {
    try {
      // Get all pending form submissions
      const pendingForms = await this.getPendingForms();
      
      for (const form of pendingForms) {
        // Check emails based on provider
        const session = await this.getUserSession(form.sender_email);
        
        if (session.provider === 'google') {
          await this.checkGmailResponses(session, form);
        } else if (session.provider === 'microsoft') {
          await this.checkOutlookResponses(session, form);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  async checkGmailResponses(session, form) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      // Search for emails from the candidate
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: `from:${form.candidate_email} subject:"RE: Information Request" after:${form.created_date}`
      });

      if (response.data.messages && response.data.messages.length > 0) {
        // Get the latest message
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.messages[0].id
        });

        // Parse the email content for form data
        const formData = this.parseEmailContent(message.data);
        
        if (formData) {
          await this.updateFormResponse(form.token, formData);
        }
      }
    } catch (error) {
      console.error('Gmail check error:', error);
    }
  }

  async checkOutlookResponses(session, form) {
    const client = Client.init({
      authProvider: (done) => {
        done(null, session.access_token);
      }
    });

    try {
      // Search for emails from the candidate
      const messages = await client
        .api('/me/messages')
        .filter(`from/emailAddress/address eq '${form.candidate_email}'`)
        .select('subject,body,receivedDateTime')
        .top(10)
        .get();

      for (const message of messages.value) {
        if (message.receivedDateTime > form.created_date) {
          // Parse the email content
          const formData = this.parseEmailContent(message);
          
          if (formData) {
            await this.updateFormResponse(form.token, formData);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Outlook check error:', error);
    }
  }

  parseEmailContent(emailData) {
    // Extract form data from email body
    // This is a simplified version - you'd need more robust parsing
    try {
      const body = emailData.body || emailData.payload?.body?.data;
      
      // Look for JSON data or structured format in email
      const jsonMatch = body.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Alternative: Parse key-value pairs
      const formData = {};
      const lines = body.split('\n');
      
      lines.forEach(line => {
        const match = line.match(/^(.+?):\s*(.+)$/);
        if (match) {
          formData[match[1].trim()] = match[2].trim();
        }
      });
      
      return Object.keys(formData).length > 0 ? formData : null;
    } catch (error) {
      console.error('Parse error:', error);
      return null;
    }
  }

  async updateFormResponse(token, responseData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE forms 
         SET response_data = ?, status = 'completed', completed_date = CURRENT_TIMESTAMP 
         WHERE token = ?`,
        [JSON.stringify(responseData), token],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`✅ Form ${token} marked as completed`);
            this.notifyDashboard(token);
            resolve();
          }
        }
      );
    });
  }

  async notifyDashboard(token) {
    // Send WebSocket notification or update cache
    // This would trigger real-time updates in the frontend
    if (global.io) {
      global.io.emit('formCompleted', { token });
    }
  }

  async getPendingForms() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM forms WHERE status = 'pending'`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async getUserSession(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM user_sessions WHERE user_email = ?`,
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  stopPolling() {
    this.isPolling = false;
    console.log('📧 Stopped email polling service');
  }
}

module.exports = EmailPollingService;