// recruitment-backend/services/pollingService.js
const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
const database = require('../utils/database');
const oauthService = require('./oauthService');

class PollingService {
  constructor() {
    this.pollingInterval = parseInt(process.env.POLLING_INTERVAL) || 60000; // 1 minute default
    this.isPolling = false;
    this.pollingTimer = null;
  }

  // ==================== START/STOP POLLING ====================
  
  start() {
    if (this.isPolling) {
      console.log('📧 Polling service is already running');
      return;
    }
    
    this.isPolling = true;
    console.log('📧 Starting email polling service...');
    
    // Run immediately, then schedule
    this.checkForResponses();
    
    // Set up interval
    this.pollingTimer = setInterval(() => {
      this.checkForResponses();
    }, this.pollingInterval);
  }

  stop() {
    if (!this.isPolling) {
      console.log('📧 Polling service is not running');
      return;
    }
    
    this.isPolling = false;
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    console.log('📧 Stopped email polling service');
  }

  // ==================== MAIN POLLING FUNCTION ====================
  
  async checkForResponses() {
    try {
      console.log('🔍 Checking for email responses...');
      
      // Get all pending forms
      const pendingForms = await database.getPendingForms();
      
      if (pendingForms.length === 0) {
        console.log('📭 No pending forms to check');
        return;
      }
      
      console.log(`📬 Checking ${pendingForms.length} pending forms`);
      
      // Group forms by sender email and provider
      const formsBySender = this.groupFormsBySender(pendingForms);
      
      // Check each sender's inbox
      for (const [key, forms] of Object.entries(formsBySender)) {
        const [email, provider] = key.split('|');
        
        try {
          if (provider === 'google') {
            await this.checkGmailResponses(email, forms);
          } else if (provider === 'microsoft') {
            await this.checkOutlookResponses(email, forms);
          } else if (provider === 'smtp') {
            // For SMTP, we can't poll - would need webhook or manual check
            console.log(`⚠️ Cannot poll SMTP emails for ${email}`);
          }
        } catch (error) {
          console.error(`Error checking ${provider} for ${email}:`, error);
        }
      }
      
      console.log('✅ Polling cycle completed');
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }

  // ==================== GMAIL POLLING ====================
  
  async checkGmailResponses(senderEmail, forms) {
    try {
      console.log(`🔍 Checking Gmail for ${senderEmail}`);
      
      // Get OAuth tokens
      const tokens = await oauthService.getValidToken(senderEmail, 'google');
      
      // Set up Gmail client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // For each form, check for replies
      for (const form of forms) {
        try {
          // Build search query
          const query = [
            `from:${form.candidate_email}`,
            `subject:"RE: Complete Your Information"`,
            `after:${Math.floor(new Date(form.sent_date).getTime() / 1000)}`
          ].join(' ');
          
          // Search for messages
          const response = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 10
          });
          
          if (response.data.messages && response.data.messages.length > 0) {
            console.log(`📨 Found ${response.data.messages.length} potential replies for form ${form.token}`);
            
            // Check each message
            for (const msg of response.data.messages) {
              await this.processGmailMessage(gmail, msg.id, form);
            }
          }
          
          // Also check if candidate clicked the link (track opens)
          await this.checkFormOpens(form);
          
        } catch (error) {
          console.error(`Error checking responses for form ${form.token}:`, error);
        }
      }
    } catch (error) {
      console.error('Gmail polling error:', error);
      throw error;
    }
  }

  async processGmailMessage(gmail, messageId, form) {
    try {
      // Get full message
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      // Extract message content
      const messageData = this.extractGmailContent(message.data);
      
      // Check if this is a form submission response
      if (this.isFormSubmissionReply(messageData, form)) {
        console.log(`✅ Found form submission reply for ${form.token}`);
        
        // Parse the response data if it's in the email
        const responseData = this.parseEmailResponse(messageData.body);
        
        if (responseData) {
          // Update form status
          await database.updateFormStatus(form.token, 'completed', {
            response_data: responseData,
            completed_date: new Date().toISOString()
          });
          
          // Log activity
          await database.logActivity(
            form.case_id,
            form.token,
            'form_completed_email',
            `Form completed via email reply from ${form.candidate_email}`,
            form.sender_email
          );
          
          console.log(`📝 Updated form ${form.token} as completed via email`);
        }
      }
    } catch (error) {
      console.error(`Error processing Gmail message ${messageId}:`, error);
    }
  }

  // ==================== OUTLOOK POLLING ====================
  
  async checkOutlookResponses(senderEmail, forms) {
    try {
      console.log(`🔍 Checking Outlook for ${senderEmail}`);
      
      // Get OAuth tokens
      const tokens = await oauthService.getValidToken(senderEmail, 'microsoft');
      
      // Set up Microsoft Graph client
      const client = Client.init({
        authProvider: (done) => {
          done(null, tokens.access_token);
        }
      });
      
      // For each form, check for replies
      for (const form of forms) {
        try {
          // Search for messages from candidate
          const messages = await client
            .api('/me/messages')
            .filter(`from/emailAddress/address eq '${form.candidate_email}' and receivedDateTime ge ${form.sent_date}`)
            .select('id,subject,body,receivedDateTime,from')
            .top(10)
            .get();
          
          if (messages.value && messages.value.length > 0) {
            console.log(`📨 Found ${messages.value.length} potential replies for form ${form.token}`);
            
            // Process each message
            for (const message of messages.value) {
              await this.processOutlookMessage(message, form);
            }
          }
          
          // Also check if candidate clicked the link
          await this.checkFormOpens(form);
          
        } catch (error) {
          console.error(`Error checking responses for form ${form.token}:`, error);
        }
      }
    } catch (error) {
      console.error('Outlook polling error:', error);
      throw error;
    }
  }

  async processOutlookMessage(message, form) {
    try {
      // Check if this is a form submission response
      const messageData = {
        subject: message.subject,
        body: message.body.content,
        from: message.from.emailAddress.address
      };
      
      if (this.isFormSubmissionReply(messageData, form)) {
        console.log(`✅ Found form submission reply for ${form.token}`);
        
        // Parse the response data
        const responseData = this.parseEmailResponse(messageData.body);
        
        if (responseData) {
          // Update form status
          await database.updateFormStatus(form.token, 'completed', {
            response_data: responseData,
            completed_date: new Date().toISOString()
          });
          
          // Log activity
          await database.logActivity(
            form.case_id,
            form.token,
            'form_completed_email',
            `Form completed via email reply from ${form.candidate_email}`,
            form.sender_email
          );
          
          console.log(`📝 Updated form ${form.token} as completed via email`);
        }
      }
    } catch (error) {
      console.error('Error processing Outlook message:', error);
    }
  }

  // ==================== HELPER FUNCTIONS ====================
  
  groupFormsBySender(forms) {
    const grouped = {};
    
    for (const form of forms) {
      // Get provider for this sender
      const tracking = database.get(
        'SELECT provider FROM email_tracking WHERE form_token = ?',
        [form.token]
      );
      
      const provider = tracking?.provider || 'smtp';
      const key = `${form.sender_email}|${provider}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(form);
    }
    
    return grouped;
  }

  extractGmailContent(messageData) {
    const headers = messageData.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    
    // Extract body
    let body = '';
    
    if (messageData.payload.body?.data) {
      body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
    } else if (messageData.payload.parts) {
      for (const part of messageData.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }
    
    return { subject, from, body };
  }

  isFormSubmissionReply(messageData, form) {
    // Check if this is likely a reply to our form email
    const subjectMatch = messageData.subject?.toLowerCase().includes('complete your information');
    const fromMatch = messageData.from?.toLowerCase().includes(form.candidate_email.toLowerCase());
    const hasFormToken = messageData.body?.includes(form.token);
    
    return subjectMatch && fromMatch;
  }

  parseEmailResponse(emailBody) {
    // Try to extract form data from email body
    // This is a simple implementation - you might want to make it more sophisticated
    
    try {
      // Look for JSON data
      const jsonMatch = emailBody.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Look for key-value pairs
      const lines = emailBody.split('\n');
      const data = {};
      
      for (const line of lines) {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
          const value = match[2].trim();
          data[key] = value;
        }
      }
      
      return Object.keys(data).length > 0 ? data : null;
    } catch (error) {
      console.error('Error parsing email response:', error);
      return null;
    }
  }

  async checkFormOpens(form) {
    // Check if form was opened (by checking form access logs)
    // This would typically be done by tracking pixel or form page visits
    
    try {
      const formData = await database.getFormByToken(form.token);
      
      // If form status is still 'sent' but we have evidence it was opened
      if (formData.status === 'sent' && formData.opened_date) {
        await database.updateFormStatus(form.token, 'opened');
        
        await database.logActivity(
          form.case_id,
          form.token,
          'form_opened',
          `Form opened by ${form.candidate_email}`,
          form.sender_email
        );
        
        console.log(`👁️ Form ${form.token} marked as opened`);
      }
    } catch (error) {
      console.error('Error checking form opens:', error);
    }
  }

  // ==================== MANUAL CHECK ====================
  
  async manualCheck(caseId) {
    try {
      const forms = await database.getFormsByCaseId(caseId);
      
      if (forms.length === 0) {
        return { message: 'No forms found for this case' };
      }
      
      // Group by sender and check
      const formsBySender = this.groupFormsBySender(forms.filter(f => f.status !== 'completed'));
      
      for (const [key, formsList] of Object.entries(formsBySender)) {
        const [email, provider] = key.split('|');
        
        if (provider === 'google') {
          await this.checkGmailResponses(email, formsList);
        } else if (provider === 'microsoft') {
          await this.checkOutlookResponses(email, formsList);
        }
      }
      
      // Get updated forms
      const updatedForms = await database.getFormsByCaseId(caseId);
      
      return {
        checked: forms.length,
        completed: updatedForms.filter(f => f.status === 'completed').length,
        pending: updatedForms.filter(f => f.status !== 'completed').length
      };
    } catch (error) {
      console.error('Manual check error:', error);
      throw error;
    }
  }
}

module.exports = new PollingService();