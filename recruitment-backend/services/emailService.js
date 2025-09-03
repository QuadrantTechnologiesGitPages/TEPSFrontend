// recruitment-backend/services/emailService.js
const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
const nodemailer = require('nodemailer');
const database = require('../utils/database');
const oauthService = require('./oauthService');

class EmailService {
  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  // ==================== MAIN SEND FUNCTION ====================
  
  async sendFormEmail(formData) {
    try {
      const { 
        token, 
        candidateEmail, 
        candidateName,
        senderEmail, 
        caseId,
        fields 
      } = formData;

      // Check which provider the sender has authenticated with
      const oauthStatus = await oauthService.checkOAuthStatus(senderEmail);
      
      let result;
      
      if (oauthStatus.google) {
        result = await this.sendGmailEmail(formData);
      } else if (oauthStatus.microsoft) {
        result = await this.sendOutlookEmail(formData);
      } else {
        // Fallback to SMTP if no OAuth
        result = await this.sendSMTPEmail(formData);
      }

      // Update form status in database
      await database.updateFormStatus(token, 'sent', {
        email_message_id: result.messageId,
        email_thread_id: result.threadId
      });

      // Log activity
      await database.logActivity(
        caseId,
        token,
        'form_sent',
        `Form sent to ${candidateEmail}`,
        senderEmail
      );

      return result;
    } catch (error) {
      console.error('Error sending form email:', error);
      throw error;
    }
  }

  // ==================== GMAIL ====================
  
  async sendGmailEmail(formData) {
    try {
      const { 
        token, 
        candidateEmail, 
        candidateName,
        senderEmail 
      } = formData;

      // Get valid OAuth token
      const tokens = await oauthService.getValidToken(senderEmail, 'google');
      
      // Set up Gmail client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials(tokens);
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Create email content
      const emailContent = this.createEmailContent(formData);
      
      // Create the email message
      const message = this.createMimeMessage(
        senderEmail,
        candidateEmail,
        'Complete Your Information - Action Required',
        emailContent.html,
        emailContent.text
      );
      
      // Send the email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
        }
      });
      
      // Store email tracking info
      await database.run(`
        INSERT INTO email_tracking (form_token, message_id, thread_id, provider)
        VALUES (?, ?, ?, ?)
      `, [token, response.data.id, response.data.threadId, 'google']);
      
      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        provider: 'google'
      };
    } catch (error) {
      console.error('Gmail send error:', error);
      throw error;
    }
  }

  // ==================== OUTLOOK/MICROSOFT ====================
  
  async sendOutlookEmail(formData) {
    try {
      const { 
        token, 
        candidateEmail, 
        candidateName,
        senderEmail 
      } = formData;

      // Get valid OAuth token
      const tokens = await oauthService.getValidToken(senderEmail, 'microsoft');
      
      // Set up Microsoft Graph client
      const client = Client.init({
        authProvider: (done) => {
          done(null, tokens.access_token);
        }
      });
      
      // Create email content
      const emailContent = this.createEmailContent(formData);
      
      // Send email via Microsoft Graph
      const response = await client
        .api('/me/sendMail')
        .post({
          message: {
            subject: 'Complete Your Information - Action Required',
            body: {
              contentType: 'HTML',
              content: emailContent.html
            },
            toRecipients: [
              {
                emailAddress: {
                  address: candidateEmail,
                  name: candidateName
                }
              }
            ],
            importance: 'high',
            internetMessageHeaders: [
              {
                name: 'X-Form-Token',
                value: token
              }
            ]
          },
          saveToSentItems: true
        });
      
      // Store email tracking info
      await database.run(`
        INSERT INTO email_tracking (form_token, message_id, provider)
        VALUES (?, ?, ?)
      `, [token, response?.id || Date.now().toString(), 'microsoft']);
      
      return {
        success: true,
        messageId: response?.id || Date.now().toString(),
        provider: 'microsoft'
      };
    } catch (error) {
      console.error('Outlook send error:', error);
      throw error;
    }
  }

  // ==================== SMTP FALLBACK ====================
  
  async sendSMTPEmail(formData) {
    try {
      const { 
        token, 
        candidateEmail, 
        candidateName,
        senderEmail 
      } = formData;

      // Create transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        }
      });
      
      // Create email content
      const emailContent = this.createEmailContent(formData);
      
      // Send email
      const response = await transporter.sendMail({
        from: `"Recruitment Team" <${process.env.EMAIL_USER}>`,
        replyTo: senderEmail,
        to: candidateEmail,
        subject: 'Complete Your Information - Action Required',
        text: emailContent.text,
        html: emailContent.html,
        headers: {
          'X-Form-Token': token
        }
      });
      
      // Store email tracking info
      await database.run(`
        INSERT INTO email_tracking (form_token, message_id, provider)
        VALUES (?, ?, ?)
      `, [token, response.messageId, 'smtp']);
      
      return {
        success: true,
        messageId: response.messageId,
        provider: 'smtp'
      };
    } catch (error) {
      console.error('SMTP send error:', error);
      throw error;
    }
  }

  // ==================== EMAIL CONTENT CREATION ====================
  
  createEmailContent(formData) {
    const { token, candidateName, candidateEmail } = formData;
    const formUrl = `${this.frontendUrl}/candidate-form/${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Information Request</h2>
            <p>Complete Your Profile</p>
          </div>
          <div class="content">
            <p>Dear ${candidateName || 'Candidate'},</p>
            
            <p>We need you to complete your profile information for our records. This will help us match you with the best opportunities.</p>
            
            <p>Please click the button below to fill out the required information:</p>
            
            <center>
              <a href="${formUrl}" class="button">Complete Your Information</a>
            </center>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This link will expire in 7 days. Please complete it at your earliest convenience.
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${formUrl}</p>
            
            <div class="footer">
              <p>Best regards,<br>The Recruitment Team</p>
              <p style="color: #999;">This is an automated message. Please do not reply directly to this email.</p>
              <p style="color: #999; font-size: 10px;">Form ID: ${token}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Dear ${candidateName || 'Candidate'},

We need you to complete your profile information for our records.

Please visit the following link to fill out the required information:
${formUrl}

This link will expire in 7 days. Please complete it at your earliest convenience.

Best regards,
The Recruitment Team

Form ID: ${token}
    `;
    
    return { html, text };
  }

  // ==================== MIME MESSAGE CREATION ====================
  
  createMimeMessage(from, to, subject, htmlContent, textContent) {
    const boundary = '----=_Part_' + Date.now();
    
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      textContent,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlContent,
      '',
      `--${boundary}--`
    ].join('\r\n');
    
    return message;
  }

  // ==================== CHECK EMAIL STATUS ====================
  
  async checkEmailStatus(token) {
    try {
      const tracking = await database.get(
        'SELECT * FROM email_tracking WHERE form_token = ?',
        [token]
      );
      
      if (!tracking) {
        return { status: 'not_sent' };
      }
      
      return {
        status: tracking.status,
        provider: tracking.provider,
        messageId: tracking.message_id,
        sentAt: tracking.created_at
      };
    } catch (error) {
      console.error('Error checking email status:', error);
      return { status: 'error' };
    }
  }
}

module.exports = new EmailService();